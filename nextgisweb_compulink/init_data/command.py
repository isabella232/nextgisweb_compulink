# -*- coding: utf-8 -*-
from os import path
import tempfile
import uuid
import zipfile
from osgeo import ogr
import shutil
from sqlalchemy.orm.exc import NoResultFound
import transaction
from nextgisweb import DBSession
from nextgisweb.auth import User, Group
from nextgisweb.command import Command
from nextgisweb.resource import ResourceGroup, ACLRule
from nextgisweb.env import env
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.vector_layer.model import _set_encoding, VE
from nextgisweb_compulink.compulink_admin.model import ConstructObject
from nextgisweb_compulink.compulink_admin.well_known_resource import *
from nextgisweb_compulink.db_migrations.common import VectorLayerUpdater
from default_dicts import DEFAULT_COMPULINK_DICTS
from nextgisweb_lookuptable.model import LookupTable

BASE_PATH = path.abspath(path.dirname(__file__))

@Command.registry.register
class DBInit():
    identity = 'compulink.init_db'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--force', dest='force', action='store_true', default=False)
        parser.add_argument('--action', choices=['all',
                                                 'icons',
                                                 'dict_group',
                                                 'shape_dicts',
                                                 'dicts',
                                                 'domain_dicts',
                                                 'rt_domain_dicts'
                                                 ], default='all')


    @classmethod
    def execute(cls, args, env=None, make_transaction=True):
        if make_transaction:
            transaction.manager.begin()

        if args.action in ['all', 'dict_group']:
            cls.create_dict_group()
        if args.action in ['all', 'shape_dicts']:
            cls.load_shape_dicts(force=args.force)
        if args.action in ['all', 'icons']:
            cls.load_icons()
        if args.action in ['all', 'dicts']:
            cls.load_dicts(force=args.force)
        if args.action in ['all', 'domain_dicts']:
            cls.load_domain_dicts(force=args.force)
        if args.action in ['all', 'rt_domain_dicts']:
            cls.load_rt_domain_dicts(force=args.force)

        if make_transaction:
            transaction.manager.commit()


    @classmethod
    def create_dict_group(cls):
        print 'Create Dicts group resource...'

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
                scope='data',
                permission='read',
                action='allow',
                propagate=True))

            obj.persist()

    @classmethod
    def load_shape_dicts(cls, force=False):
        print 'Loading shapes...'

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
            root_res = ResourceGroup.filter_by(keyname=DICTIONARY_GROUP_KEYNAME).one()
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


    @classmethod
    def load_icons(cls):
        print 'Loading style icons...'
        env.marker_library.load_collection('nextgisweb_compulink', 'compulink_admin/layers_default_styles')

    @classmethod
    def load_dicts(cls, force=False):
        print 'Loading default dicts...'

        # get principals
        adminusr = User.filter_by(keyname='administrator').one()
        admingrp = Group.filter_by(keyname='administrators').one()
        everyone = User.filter_by(keyname='everyone').one()

        # get root resource
        try:
            root_res = ResourceGroup.filter_by(keyname=DICTIONARY_GROUP_KEYNAME).one()
        except NoResultFound:
            raise Exception('Need dictionaries group resource!')

        # upload dicts
        for dict_keyname, dict_values in DEFAULT_COMPULINK_DICTS.iteritems():
            try:
                dict_res = LookupTable.filter_by(keyname=dict_keyname).one()
                if not force:
                    print '   Dictionary "%s" already exists' % dict_keyname
                    continue
                else:
                    print '   Dictionary "%s" already exists and will be recreated' % dict_keyname
            except NoResultFound:
                dict_res = LookupTable(owner_user=adminusr,
                                  display_name=dict_values['display_name'],
                                  keyname=dict_keyname,
                                  parent=root_res)

                dict_res.acl.append(ACLRule(
                    principal=admingrp,
                    action='allow'))

            dict_res.val = dict_values['items']
            dict_res.persist()

    @classmethod
    def load_domain_dicts(cls, force=False):
        print 'Loading domain dicts...'
        from ..compulink_admin.model import Region, District
        from csv import DictReader

        db_session = DBSession()
        db_session.autoflush = False


        if (db_session.query(Region).count() > 0 or db_session.query(District).count() > 0) and not force:
            print '     Domain dictionary already existings! Returning...'
            return

        with open(path.join(BASE_PATH, 'regions.csv')) as reg_csv, \
             open(path.join(BASE_PATH, 'districts.csv')) as dist_csv:

            reg_reader = DictReader(reg_csv)
            dist_reader = DictReader(dist_csv)

            regs = {}
            for reg_row in reg_reader:
                region = Region()
                region.name = reg_row['name']
                region.short_name = reg_row['short_name']
                region.region_code = reg_row['region_code']
                region.persist()
                regs[reg_row['id']] = region

            for dist_row in dist_reader:
                district = District()
                district.name = dist_row['name']
                district.short_name = dist_row['short_name']
                district.region = regs[dist_row['region_id']]

                district.persist()

        db_session.flush()


    @classmethod
    def load_rt_domain_dicts(cls, force=False):
        print 'Loading RT domain dicts...'
        from ..compulink_admin.model import Region
        from ..compulink_reporting.model import RtMacroDivision, RtBranch, RtBranchRegion
        from csv import DictReader

        db_session = DBSession()
        db_session.autoflush = False

        if (db_session.query(RtMacroDivision).count() > 0 or
            db_session.query(RtBranch).count() > 0 or
            db_session.query(RtBranchRegion).count() > 0
            ) and not force:
            print '     RT Domain dictionary already existings! Returning...'
            return

        with open(path.join(BASE_PATH, 'rt_macro_division.csv')) as macro_csv, \
            open(path.join(BASE_PATH, 'rt_branch.csv')) as branch_csv, \
            open(path.join(BASE_PATH, 'rt_branch_region.csv')) as branch_region_csv:

            macro_reader = DictReader(macro_csv)
            branch_reader = DictReader(branch_csv)
            branch_region_reader = DictReader(branch_region_csv)


            macros = {}
            branches = {}
            for macro_row in macro_reader:
                macro = RtMacroDivision()
                macro.name = macro_row['name']
                macro.persist()
                macros[macro_row['id']] = macro

            for branch_row in branch_reader:
                branch = RtBranch()
                branch.name = branch_row['name']
                branch.rt_macro_division = macros[branch_row['macro_division_id']]
                branch.persist()
                branches[branch_row['id']] = branch

            for br_reg_row in branch_region_reader:
                branch_reg = RtBranchRegion()
                branch_reg.rt_branch = branches[br_reg_row['rt_branch_id']]
                branch_reg.region = db_session.query(Region).filter(Region.region_code == br_reg_row['region_code']).one()
                branch_reg.persist()

        db_session.flush()














