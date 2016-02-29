# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import datetime
import uuid

from nextgisweb import DBSession
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

