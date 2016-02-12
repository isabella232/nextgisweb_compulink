# coding=utf-8

import os
import transaction
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.db_migrations.common import VectorLayerUpdater

BASE_PATH = os.path.abspath(os.path.dirname(__file__))


def add_guid_field(args):
    db_session = DBSession()

    transaction.manager.begin()

    resources = db_session.query(VectorLayer).options(joinedload_all('fields')).filter(VectorLayer.keyname.like('real_%')).all()

    for vec_layer in resources:
        try:
            VectorLayerUpdater.append_field(
                vec_layer,
                'feat_guid',
                FIELD_TYPE.STRING,
                u'Глобальный идентификатор',
                field_grid_vis=False)

            print "Fields of %s was updated!" % vec_layer.keyname

        except Exception, ex:
            print "Error on update fields struct %s: %s" % (vec_layer.keyname, ex.message)


    transaction.manager.commit()
    db_session.close()
