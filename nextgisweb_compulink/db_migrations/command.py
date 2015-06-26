# -*- coding: utf-8 -*-
import json
import codecs
import os
from sqlalchemy import Float
from sqlalchemy.orm import joinedload_all
import transaction
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_REAL_LAYER_STRUCT
from nextgisweb_compulink.compulink_admin.model import FoclStruct, ModelsUtils, BASE_PATH
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
        parser.add_argument('--migration', required=True, choices=['append_focl_direct_length', 'append_real_layers', 'update_real_lyr_names'])

    @classmethod
    def execute(cls, args, env):
        if args.migration == 'append_focl_direct_length':
            cls.append_focl_direct_length()
        if args.migration == 'append_real_layers':
            cls.append_real_layers()
        if args.migration == 'update_real_lyr_names':
            cls.update_names_of_reals_layers()

    @classmethod
    def append_real_layers(cls):
        db_session = DBSession()

        transaction.manager.begin()

        fs_resources = db_session.query(FoclStruct).all()

        real_layers_template_path = os.path.join(BASE_PATH, 'real_layers_templates/')

        for fs in fs_resources:
            fs_children_keys = [res.keyname for res in fs.children if res.keyname]
            for vl_name in FOCL_REAL_LAYER_STRUCT:
                # check exists
                found = [res_key for res_key in fs_children_keys if vl_name in res_key]
                if not found:
                    try:
                        with codecs.open(os.path.join(real_layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                            json_layer_struct = json.load(json_file, encoding='utf-8')
                            vector_layer = ModelsUtils.create_vector_layer(fs, json_layer_struct, vl_name)
                            mapserver_style = ModelsUtils.set_default_style(vector_layer, vl_name, 'default')
                    except Exception, ex:
                        print 'Error on append layer %s to %s: %s' % (vl_name, fs.display_name, ex.message)
                    print 'Focl struct %s. Added: %s' % (fs.display_name, vl_name)

        transaction.manager.commit()
        db_session.close()

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

    @classmethod
    def update_names_of_reals_layers(cls):
        db_session = DBSession()

        transaction.manager.begin()

        # what update
        upd_project_layers = ['access_point', 'fosc', 'optical_cable', 'optical_cross', 'special_transition']

        upd_real_layers = ['real_access_point', 'real_fosc', 'real_optical_cable', 'real_optical_cable_point',
                              'real_optical_cross', 'real_special_transition', 'real_special_transition_point']

        upd_project_lyr_names = {}
        upd_real_lyr_names = {}

        # new names
        proj_layers_template_path = os.path.join(BASE_PATH, 'layers_templates/')

        for up_lyr_name in upd_project_layers:
            with codecs.open(os.path.join(proj_layers_template_path, up_lyr_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                new_name = json_layer_struct['resource']['display_name']
                upd_project_lyr_names[up_lyr_name] = new_name

        real_layers_template_path = os.path.join(BASE_PATH, 'real_layers_templates/')
        for up_lyr_name in upd_real_layers:
            with codecs.open(os.path.join(real_layers_template_path, up_lyr_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                new_name = json_layer_struct['resource']['display_name']
                upd_real_lyr_names[up_lyr_name] = new_name

        # update now
        resources = db_session.query(VectorLayer).all()

        for vec_layer in resources:
            lyr_name = vec_layer.keyname
            if not lyr_name:
                continue

            for up_lyr_name in upd_project_lyr_names.keys():
                if lyr_name.startswith(up_lyr_name) and not lyr_name.startswith(up_lyr_name + '_point'):  # ugly!
                    vec_layer.display_name = upd_project_lyr_names[up_lyr_name]
                    #vec_layer.persist()
                    print '%s updated' % lyr_name
                    break

            for up_lyr_name in upd_real_lyr_names.keys():
                if lyr_name.startswith(up_lyr_name) and not lyr_name.startswith(up_lyr_name + '_point'):  # ugly!
                    vec_layer.display_name = upd_real_lyr_names[up_lyr_name]
                    #vec_layer.persist()
                    print '%s updated' % lyr_name
                    break

        transaction.manager.commit()
        db_session.close()














