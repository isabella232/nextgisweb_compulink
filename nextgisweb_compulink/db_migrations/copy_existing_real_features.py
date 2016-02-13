# coding=utf-8
import uuid

import os
import transaction
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.layers_struct import ACTUAL_FOCL_REAL_LAYER_STRUCT, FOCL_REAL_LAYER_STRUCT
from nextgisweb_compulink.compulink_admin.model import FoclStruct

BASE_PATH = os.path.abspath(os.path.dirname(__file__))


def copy_existing_real_features(args):
    db_session = DBSession()

    transaction.manager.begin()

    fs_resources = db_session.query(FoclStruct).all()

    for focl_struct in fs_resources:

        layers = focl_struct.children
        real_layer = None
        actual_layer = None

        for real_layer_name in FOCL_REAL_LAYER_STRUCT:
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
                print 'Ops! Needed layers not found!'
                return

            try:
                query = real_layer.feature_query()
                query.geom()

                for feat in query():
                    actual_layer.feature_put(feat)

                print "Layers %s was updated!" % actual_layer.keyname

            except Exception, ex:
                print "Error on update %s: %s" % (actual_layer.keyname, ex.message)
            db_session.flush()

    transaction.manager.commit()
    db_session.close()
