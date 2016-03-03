# coding=utf-8
import transaction

from nextgisweb import DBSession
from nextgisweb.feature_attachment.model import FeatureAttachment
from nextgisweb_compulink.compulink_admin.model import FoclStruct


SOURCE_LAYERS = [
    'real_special_transition_point',
    'real_optical_cable_point',
    'real_fosc',
    'real_optical_cross',
    'real_access_point',
]


def copy_existing_real_feat_attaches(args):
    db_session = DBSession()

    transaction.manager.begin()

    fs_resources = db_session.query(FoclStruct).all()

    for focl_struct in fs_resources:

        layers = focl_struct.children
        real_layer = None
        actual_layer = None

        for real_layer_name in SOURCE_LAYERS:
            # get real layer and actual layer
            for lyr in layers:
                if lyr.keyname:
                    lyr_name = '_'.join(lyr.keyname.rsplit('_')[0:-1])
                else:
                    continue

                if real_layer_name == lyr_name:
                    real_layer = lyr

                if 'actual_' + real_layer_name == lyr_name:
                    actual_layer = lyr

            if not real_layer or not actual_layer:
                print 'Ops!!!!!!!!!!!!!!!! Needed layers not found!'
                return

            _copy_attaches(real_layer, actual_layer)
            print "Attaches for layers %s was updated!" % actual_layer.keyname

            db_session.flush()

    transaction.manager.commit()
    db_session.close()



def _copy_attaches(real_layer, actual_layer):
    # get all features from src layer
    query_src = real_layer.feature_query()

    # get all features from dest layer
    query_dest = actual_layer.feature_query()
    # extract to dict
    dest_feats = {}
    for feat in query_dest():
        if feat.fields['feat_guid']:
            dest_feats[feat.fields['feat_guid']] = feat

    for src_feat in query_src():
        if src_feat.fields['feat_guid'] in dest_feats.keys():
            _copy_feat_attache(src_feat, dest_feats[src_feat.fields['feat_guid']])


def _copy_feat_attache(src_feat, dst_feat):
    # get all attaches for src feats
    src_atts = FeatureAttachment.filter_by(
        resource_id=src_feat.layer.id,
        feature_id=src_feat.id)

    for src_attache in src_atts:
        mirror_attache = FeatureAttachment()
        mirror_attache.resource_id = dst_feat.layer.id
        mirror_attache.feature_id = dst_feat.id
        mirror_attache.fileobj_id = src_attache.fileobj_id
        mirror_attache.size = src_attache.size
        mirror_attache.mime_type = src_attache.mime_type
        mirror_attache.name = src_attache.name
        mirror_attache.description = src_attache.description