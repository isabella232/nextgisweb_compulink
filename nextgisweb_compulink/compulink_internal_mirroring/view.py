# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from nextgisweb import DBSession
from nextgisweb.vector_layer import VectorLayer


def setup_events():
    return
    #VectorLayer.after_feature_create += after_feature_create_handler


def after_feature_create_handler(resource=None, feature_id=None):
    # check layer
    if resource.id == 8040:
        return

    # get orig feature
    query = resource.feature_query()
    query.filter_by(id=feature_id)
    query.geom()
    features = query()

    if features.total_count < 1:
        # TODO: Logging
        return

    feature = next(features.__iter__())


    # get target feature layer
    db_session = DBSession()
    lyr = db_session.query(VectorLayer).get(8040)

    new_id = lyr.feature_create(feature)

    print 'Feature # %s was created for resource # %s' % (feature.id, resource.id)
    print 'New feature id %s. Old: %s' % (new_id, feature.id)

def create_layers_copy():
    pass


