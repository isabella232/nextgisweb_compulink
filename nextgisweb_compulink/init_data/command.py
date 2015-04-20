# -*- coding: utf-8 -*-
from os import path
import tempfile
import uuid
import zipfile
from osgeo import ogr
import shutil
from sqlalchemy.orm.exc import NoResultFound
import transaction
from nextgisweb.auth import User, Group
from nextgisweb import DBSession
from nextgisweb.command import Command
from nextgisweb.resource import ResourceGroup, ACLRule
from nextgisweb.env import env
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.vector_layer.model import _set_encoding, VE
from nextgisweb_compulink.compulink_admin.well_known_resource import *
from nextgisweb_compulink.db_migrations.common import VectorLayerUpdater

BASE_PATH = path.abspath(path.dirname(__file__))

@Command.registry.register
class DBInit():
    identity = 'compulink.init_db'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--force', dest='force', action='store_true', default=False)


    @classmethod
    def execute(cls, args, env):
        cls.create_dict_group()
        cls.load_shape_dicts(force=args.force)
        cls.load_icons()

    @classmethod
    def create_dict_group(cls):
        print 'Create Dicts group resource...'

        db_session = DBSession()

        transaction.manager.begin()

        adminusr = User.filter_by(keyname='administrator').one()
        admingrp = Group.filter_by(keyname='administrators').one()
        everyone = User.filter_by(keyname='everyone').one()

        try:
            ResourceGroup.filter_by(keyname=DICTIONARY_GROUP_KEYNAME).one()
            print 'Group already exists...'
        except NoResultFound:
            obj0 = ResourceGroup.filter_by(id=0).one()
            obj = ResourceGroup(owner_user=adminusr,
                                display_name='Справочники',
                                keyname=DICTIONARY_GROUP_KEYNAME,
                                parent=obj0
                                )

            obj.acl.append(ACLRule(
                principal=admingrp,
                action='allow'))

            obj.acl.append(ACLRule(
                principal=everyone,
                scope='resource',
                permission='delete',
                action='deny',
                propagate=False))

            obj.persist()

        transaction.manager.commit()
        db_session.close()


    @classmethod
    def load_shape_dicts(cls, force=False):
        print 'Loading shapes...'

        db_session = DBSession()
        transaction.manager.begin()

        shape_dicts = {
            REGIONS_KEYNAME:    ('regions.zip',
                                 'Регионы РФ',
                                 {
                                     REGIONS_ID_FIELD: 'Идентификатор',
                                     REGIONS_NAME_FIELD: 'Наименование',
                                 }
            ),
            DISTRICT_KEYNAME:   ('districts.zip',
                                 'Районы',
                                 {
                                     DISTRICT_ID_FIELD: 'Идентификатор',
                                     DISTRICT_NAME_FIELD: 'Наименование',
                                     DISTRICT_PARENT_ID_FIELD: 'Ид. родительского региона',
                                     DISTRICT_SHORT_NAME_FIELD: 'Короткое название'
                                 }
            ),
        }

        # get principals
        adminusr = User.filter_by(keyname='administrator').one()
        admingrp = Group.filter_by(keyname='administrators').one()
        everyone = User.filter_by(keyname='everyone').one()

        # get root resource
        try:
            root_res = ResourceGroup.filter_by(keyname='dictionary_group').one()
        except NoResultFound:
            raise Exception('Need dictionaries group resource!')


        # create shapes
        for (dict_keyname, (dict_file, dict_display_name, dict_fields)) in shape_dicts.iteritems():
            try:
                vec_res = VectorLayer.filter_by(keyname=dict_keyname).one()
                print '   Dictionary "%s" already exists' % dict_keyname
                if force:
                    print '   Force recreate "%s"' % dict_keyname
                    # try to drop old table
                    try:
                        VectorLayerUpdater.drop_vector_layer_table(vec_res.tbl_uuid)
                    except:
                        pass
                else:
                    continue
            except NoResultFound:
                vec_res = VectorLayer(owner_user=adminusr,
                                      display_name=dict_display_name,
                                      keyname=dict_keyname,
                                      parent=root_res)

                vec_res.acl.append(ACLRule(
                    principal=admingrp,
                    action='allow'))

                vec_res.acl.append(ACLRule(
                    principal=everyone,
                    scope='resource',
                    permission='delete',
                    action='deny',
                    propagate=False))


            vec_res.srs = SRS.filter_by(id=3857).one()
            datafile = path.join(BASE_PATH, dict_file)
            encoding = 'utf-8'

            iszip = zipfile.is_zipfile(datafile)

            try:
                #open ogr ds
                if iszip:
                    ogrfn = tempfile.mkdtemp()
                    zipfile.ZipFile(datafile, 'r').extractall(path=ogrfn)
                else:
                    ogrfn = datafile

                with _set_encoding(encoding) as sdecode:
                    ogrds = ogr.Open(ogrfn)
                    recode = sdecode

                if ogrds is None:
                    raise VE("Библиотеке OGR не удалось открыть файл")

                drivername = ogrds.GetDriver().GetName()

                if drivername not in ('ESRI Shapefile', ):
                    raise VE("Неподдерживаемый драйвер OGR: %s" % drivername)

                # check datasource
                if ogrds.GetLayerCount() < 1:
                    raise VE("Набор данных не содержит слоёв.")

                if ogrds.GetLayerCount() > 1:
                    raise VE("Набор данных содержит более одного слоя.")

                # open ogrlayer
                ogrlayer = ogrds.GetLayer(0)
                if ogrlayer is None:
                    raise VE("Не удалось открыть слой.")

                # check layer
                if ogrlayer.GetSpatialRef() is None:
                    raise VE("Не указана система координат слоя.")

                feat = ogrlayer.GetNextFeature()
                while feat:
                    geom = feat.GetGeometryRef()
                    if geom is None:
                        raise VE("Объект %d не содержит геометрии." % feat.GetFID())
                    feat = ogrlayer.GetNextFeature()


                ogrlayer.ResetReading()

                vec_res.tbl_uuid = uuid.uuid4().hex

                with DBSession.no_autoflush:
                    vec_res.setup_from_ogr(ogrlayer, recode)
                    vec_res.load_from_ogr(ogrlayer, recode)

            finally:
                if iszip:
                    shutil.rmtree(ogrfn)

            # display names for fields
            for field_keyname, field_dispname in dict_fields.iteritems():
                VectorLayerUpdater.change_field_display_name(vec_res, field_keyname, field_dispname)

            vec_res.persist()

        transaction.manager.commit()
        db_session.close()

    @classmethod
    def load_icons(cls):
        print 'Loading style icons...'
        env.marker_library.load_collection('nextgisweb_compulink', 'compulink_admin/layers_default_styles')














