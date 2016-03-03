# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import datetime
import uuid

from sqlalchemy import event

from nextgisweb import DBSession
from nextgisweb.feature_attachment.model import FeatureAttachment
from nextgisweb.resource import Resource
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.layers_struct_group import FOCL_REAL_LAYER_STRUCT
from nextgisweb_compulink.compulink_admin.model import FoclStruct
from nextgisweb_compulink.compulink_internal_mirroring import COMP_ID
from nextgisweb_log.model import LogEntry


def setup_events():
    VectorLayer.before_feature_create += before_feature_create_handler
    VectorLayer.after_feature_create += after_feature_create_handler



def before_feature_create_handler(resource=None, feature=None):
    # check layer (only real layers)
    if not resource.keyname or not resource.keyname.startswith('real_'):
        return

    # add guid
    try:
        feature.fields['feat_guid'] = str(uuid.uuid4().hex)
    except Exception, ex:
        LogEntry.error('Error on set feat guid! (%s, %s) %s' % (resource.keyname, feature, ex.message),
                       component=COMP_ID,
                       group='Mirroring',
                       append_dt=datetime.now())


def after_feature_create_handler(resource=None, feature_id=None):
    # check layer (only real layers)
    if not resource.keyname or not resource.keyname.startswith('real_'):
        return
    real_layer_name = '_'.join(resource.keyname.rsplit('_')[0:-1])

    # do not mirroring generated features
    if real_layer_name in ['real_optical_cable', 'real_special_transition']:
        return

    # get parent and children
    focl_struct = resource.parent
    layers = focl_struct.children

    if not isinstance(focl_struct, FoclStruct) or not layers:
        LogEntry.warning('Parent is not FoclStruct!', component=COMP_ID, group='Mirroring', append_dt=datetime.now())
        return

    # get mirror layer
    actual_layer = None

    for lyr in layers:
        if lyr.keyname:
            lyr_name = '_'.join(lyr.keyname.rsplit('_')[0:-1])
        else:
            continue
        if 'actual_' + real_layer_name == lyr_name:
            actual_layer = lyr

    if not actual_layer:
        LogEntry.error('Mirror layer was not found! (%s)' % resource.keyname, component=COMP_ID, group='Mirroring', append_dt=datetime.now())
        return


    try:
        query = resource.feature_query()
        query.filter_by(id=feature_id)
        query.geom()

        features = query()

        if features.total_count < 1:
            LogEntry.error('Feature not found in orig layer! (%s, %s)' % (resource.keyname, feature_id), component=COMP_ID, group='Mirroring', append_dt=datetime.now())
            return

        feat = next(features.__iter__())

        feat.fields['change_author'] = u'Мобильное приложение'
        feat.fields['change_date'] = feat.fields['built_date']
        actual_layer.feature_create(feat)

        print "Layers %s was updated!" % actual_layer.keyname

    except Exception, ex:
                LogEntry.error('Error on set feat guid! (%s, %s) %s' % (resource.keyname, feature_id, ex.message),
                       component=COMP_ID,
                       group='Mirroring',
                       append_dt=datetime.now())


@event.listens_for(FeatureAttachment.feature_id, 'set')
@event.listens_for(FeatureAttachment.resource_id, 'set')
@event.listens_for(FeatureAttachment.fileobj_id, 'set')
@event.listens_for(FeatureAttachment.size, 'set')
@event.listens_for(FeatureAttachment.mime_type, 'set')
def copy_attache(feat_attache, value, oldvalue, initiator):
    req_fields = dict()
    req_fields['feature_id'] = feat_attache.feature_id
    req_fields['resource_id'] = feat_attache.resource_id
    req_fields['fileobj_id'] = feat_attache.fileobj_id
    req_fields['size'] = feat_attache.size
    req_fields['mime_type'] = feat_attache.mime_type
    req_fields[initiator.key] = value

    # not full setter
    if not all([v is not None for v in req_fields.values()]):
        return

    session = DBSession

    # get layer
    try:
        orig_res = session.query(Resource).filter(Resource.id==req_fields['resource_id']).one()

        if not orig_res or not isinstance(orig_res, VectorLayer):
            return    # not support
    except:
        return

    # check mirroring layer
    real_layer_name = orig_res.keyname
    if not real_layer_name or not real_layer_name.startswith('real_') or not orig_res.parent:
        return

    # try to get mirror res
    real_layer_name = '_'.join(real_layer_name.rsplit('_')[0:-1])


    actual_layer = None

    for lyr in orig_res.parent.children:
        if lyr.keyname:
            lyr_name = '_'.join(lyr.keyname.rsplit('_')[0:-1])
        else:
            continue
        if 'actual_' + real_layer_name == lyr_name:
            actual_layer = lyr

    if not actual_layer:
        LogEntry.error('Mirror layer was not found! (Attache) (%s)' % orig_res.keyname, component=COMP_ID, group='Mirroring', append_dt=datetime.now())
        return

    # get guid of src feature
    try:
        query = orig_res.feature_query()
        query.filter_by(id=req_fields['feature_id'])
        features = query()
        if features.total_count < 1:
            LogEntry.error('Src feature was not found! (Attache) (%s)' % orig_res.keyname, component=COMP_ID,
                           group='Mirroring', append_dt=datetime.now())
            return
        src_feat = next(features.__iter__())
        src_feat_guid = src_feat.fields['feat_guid']
    except:
        LogEntry.error('Src feature was not found! (Attache) (%s)' % orig_res.keyname, component=COMP_ID,
                       group='Mirroring', append_dt=datetime.now())
        return

    # get dest feat by guid
    try:
        query = actual_layer.feature_query()
        query.filter_by(feat_guid=src_feat_guid)
        features = query()
        if features.total_count < 1:
            LogEntry.error('Dest feature was not found! (Attache) (%s, %s)' % (orig_res.keyname, src_feat_guid), component=COMP_ID,
                           group='Mirroring', append_dt=datetime.now())
            return
        dest_feat = next(features.__iter__())
        dest_feat_id = dest_feat.id
    except:
        LogEntry.error('Dest feature was not found! (Attache) (%s, %s)' % (orig_res.keyname, src_feat_guid), component=COMP_ID,
                       group='Mirroring', append_dt=datetime.now())
        return

    # create new attache
    mirror_attache = FeatureAttachment()
    mirror_attache.resource_id = actual_layer.id
    mirror_attache.feature_id = dest_feat_id
    mirror_attache.fileobj_id = req_fields['fileobj_id']
    mirror_attache.size = req_fields['size']
    mirror_attache.mime_type = req_fields['mime_type']
    mirror_attache.name = feat_attache.name
    mirror_attache.description = feat_attache.description

    DBSession.add(mirror_attache)

