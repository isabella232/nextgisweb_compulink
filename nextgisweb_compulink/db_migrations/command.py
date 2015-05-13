# -*- coding: utf-8 -*-
from sqlalchemy import Float
from sqlalchemy.orm import joinedload_all
import transaction
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.db_migrations.common import VectorLayerUpdater
from nextgisweb_mapserver.model import MapserverStyle
from os import path, listdir
from nextgisweb import DBSession
from nextgisweb.command import Command


@Command.registry.register
class DBMigrates():
    identity = 'compulink.migrates'

    @classmethod
    def argparser_setup(cls, parser, env):
        #parser.add('migration_name')
        pass

    @classmethod
    def execute(cls, args, env):
        # TODO need parse args
        cls.append_focl_direct_length()



    @classmethod
    def append_focl_direct_length(cls):
        db_session = DBSession()

        transaction.manager.begin()

        resources = db_session.query(VectorLayer).options(joinedload_all('fields')).filter(VectorLayer.keyname.like('optical_cable_%')).all()

        for vec_layer in resources:
            try:
                VectorLayerUpdater.append_field(vec_layer, 'length_direct', FIELD_TYPE.REAL, 'Длина трассы, м')
                print "Fields of %s was updated!" % vec_layer.keyname

            except Exception, ex:
                print "Error on update fields struct %s: %s" % (vec_layer.keyname, ex.message)

            try:
                VectorLayerUpdater.change_field_display_name(vec_layer, 'length', 'Длина кабеля, м')
                print "display_name for 'length' field of %s was updated!" % vec_layer.keyname
            except Exception, ex:
                print "Error on update display_name %s: %s" % (vec_layer.keyname, ex.message)

        transaction.manager.commit()
        db_session.close()














