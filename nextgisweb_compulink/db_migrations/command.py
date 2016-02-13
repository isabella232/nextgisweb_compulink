# -*- coding: utf-8 -*-
import json

import codecs
import os
from sqlalchemy import Table

from sqlalchemy.orm import joinedload_all
import transaction

from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.resource import Base
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_REAL_LAYER_STRUCT, ACTUAL_FOCL_REAL_LAYER_STRUCT
from nextgisweb_compulink.compulink_admin.model import FoclStruct, ModelsUtils, BASE_PATH, _PROJECT_STATUS_FINISHED, PROJECT_STATUS_PROJECT, \
    PROJECT_STATUS_IN_PROGRESS
from nextgisweb_compulink.db_migrations.add_guid_field import add_guid_field
from nextgisweb_compulink.db_migrations.append_actual_layers import append_actual_layers
from nextgisweb_compulink.db_migrations.common import VectorLayerUpdater, StructUpdater
from nextgisweb import DBSession
from nextgisweb.command import Command
from nextgisweb_compulink.db_migrations.copy_existing_real_features import copy_existing_real_features
from nextgisweb_compulink.db_migrations.fill_construct_obj import fill_construct_obj_12_10
from nextgisweb_compulink.db_migrations.fill_guid_field import fill_guid_field


@Command.registry.register
class DBMigrates():
    identity = 'compulink.migrates'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--migration',
                            required=True,
                            choices=[
                                'append_focl_direct_length',
                                'append_real_layers',
                                'update_real_lyr_names',
                                'check_focl_status',
                                'append_status_dt',
                                'append_start_point_field',
                                'real_layers_date_to_dt',
                                'update_aliases_01_08',
                                'update_statuses_05_11',
                                'fill_construct_obj_12_10',
                                'add_guid_field',
                                'fill_guid_field',
                                'append_actual_layers',
                                'copy_existing_real_features'
                            ])

    @classmethod
    def execute(cls, args, env):
        if args.migration == 'append_focl_direct_length':
            cls.append_focl_direct_length()
        if args.migration == 'append_real_layers':
            cls.append_real_layers()
        if args.migration == 'update_real_lyr_names':
            cls.update_names_of_reals_layers()
        if args.migration == 'check_focl_status':
            cls.check_focl_status()
        if args.migration == 'append_status_dt':
            cls.append_status_dt()
        if args.migration == 'append_start_point_field':
            cls.append_start_point_field()
        if args.migration == 'real_layers_date_to_dt':
            cls.real_layers_date_to_dt()
        if args.migration == 'update_aliases_01_08':     # 01.08.2015
            cls.update_aliases_01_08()
        if args.migration == 'update_statuses_05_11':    # 05.11.2015
            cls.update_statuses_05_11()
        if args.migration == 'fill_construct_obj_12_10':    # 10.12.2015
            fill_construct_obj_12_10(args)
        if args.migration == 'add_guid_field':          # 12.02.2016
            add_guid_field(args)
        if args.migration == 'fill_guid_field':         # 12.02.2016
            fill_guid_field(args)
        if args.migration == 'append_actual_layers':    # 12.02.2016
            append_actual_layers(args)
        if args.migration == 'copy_existing_real_features': # 12.02.2016
            copy_existing_real_features(args)


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
    def append_start_point_field(cls):
        db_session = DBSession()

        transaction.manager.begin()

        resources = db_session.query(VectorLayer).options(joinedload_all('fields')).filter(VectorLayer.keyname.like('real_optical_cable_point_%')).all()

        for vec_layer in resources:
            try:
                VectorLayerUpdater.append_field(vec_layer, 'start_point', FIELD_TYPE.INTEGER, 'Начальная точка')
                print "Fields of %s was updated!" % vec_layer.keyname

            except Exception, ex:
                print "Error on update fields struct %s: %s" % (vec_layer.keyname, ex.message)


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

    @classmethod
    def check_focl_status(cls):
        db_session = DBSession()

        transaction.manager.begin()

        # check and update
        resources = db_session.query(FoclStruct).filter(FoclStruct.status == _PROJECT_STATUS_FINISHED).all()

        for focl_struct in resources:
            focl_struct.status = PROJECT_STATUS_PROJECT
            print 'Status changed for ' + focl_struct.display_name

        transaction.manager.commit()
        db_session.close()


    @classmethod
    def append_status_dt(cls):
        db_session = DBSession()

        transaction.manager.begin()

        eng = db_session.get_bind()
        meta_data = Base.metadata
        real_table = Table(FoclStruct.__table__.name, meta_data, autoload=True, autoload_with=eng)

        if not FoclStruct.status_upd_dt.key in real_table.columns:
            StructUpdater.create_column(real_table, FoclStruct.status_upd_dt.key, FoclStruct.status_upd_dt.type)

        print 'Status DT column added for ' + real_table.name

        transaction.manager.commit()
        db_session.close()


    @classmethod
    def real_layers_date_to_dt(cls):
        '''
        Изменение типа поля built_date c date на datetime
        :return:
        '''
        db_session = DBSession()
        transaction.manager.begin()

        resources = db_session.query(VectorLayer).options(joinedload_all('fields')).filter(VectorLayer.keyname.like('real_%')).all()

        for vec_layer in resources:
            try:
                VectorLayerUpdater.change_field_datatype(vec_layer, 'built_date', FIELD_TYPE.DATETIME)
                print "Field of %s was updated!" % vec_layer.keyname

            except Exception, ex:
                print "Error on update field type %s: %s" % (vec_layer.keyname, ex.message)


        transaction.manager.commit()
        db_session.close()

    @classmethod
    def update_aliases_01_08(cls):
        db_session = DBSession()

        transaction.manager.begin()

        # real layers
        resources = db_session.query(VectorLayer).options(joinedload_all('fields')).filter(VectorLayer.keyname.like('real_%')).all()

        for vec_layer in resources:
            try:
                VectorLayerUpdater.change_field_display_name(vec_layer, 'built_date', 'Дата строительства')
                print "display_name for 'built_date' field of %s was updated!" % vec_layer.keyname

                VectorLayerUpdater.change_field_display_name(vec_layer, 'is_deviation', 'Есть отклонение от проекта')
                print "display_name for 'is_deviation' field of %s was updated!" % vec_layer.keyname

                VectorLayerUpdater.change_field_display_name(vec_layer, 'deviation_distance', 'Отклонение от проекта, м')
                print "display_name for 'deviation_distance' field of %s was updated!" % vec_layer.keyname

            except Exception, ex:
                print "Error on update fields %s: %s" % (vec_layer.keyname, ex.message)
                return

        # project layers
        resources = db_session.query(VectorLayer).options(joinedload_all('fields')).all()
        layers_names = ['access_point', 'fosc', 'optical_cable', 'optical_cross', 'pole', 'telecom_cabinet', 'endpoint']

        for vec_layer in resources:

            if not vec_layer.keyname:
                continue

            accept = False
            for lyr_name in layers_names:
                if vec_layer.keyname.startswith(lyr_name):
                    accept = True
                    break
            if not accept:
                continue

            try:
                if not vec_layer.keyname.startswith('endpoint'):
                    VectorLayerUpdater.change_field_display_name(vec_layer, 'status_built_ch', 'Дата завершения строительства')
                    print "display_name for 'status_built_ch' field of %s was updated!" % vec_layer.keyname

                VectorLayerUpdater.change_field_display_name(vec_layer, 'status_check_ch', 'Дата проверки')
                print "display_name for 'status_check_ch' field of %s was updated!" % vec_layer.keyname

            except Exception, ex:
                print "Error on update fields%s: %s" % (vec_layer.keyname, ex.message)
                return



        transaction.manager.commit()
        db_session.close()


    @classmethod
    def update_statuses_05_11(cls):
        db_session = DBSession()

        transaction.manager.begin()

        resources = db_session.query(FoclStruct).filter(FoclStruct.status == PROJECT_STATUS_PROJECT)

        for focl_struct in resources:
            # search in all real layers
            for ch_resource in focl_struct.children:
                if ch_resource.keyname and ch_resource.keyname.startswith('real_'):
                    #get feat count
                    query = ch_resource.feature_query()
                    result = query()
                    count = result.total_count or 0
                    if count > 0:
                        focl_struct.status = PROJECT_STATUS_IN_PROGRESS
                        print 'Status changed for ' + focl_struct.display_name
                        break

        transaction.manager.commit()
        db_session.close()
