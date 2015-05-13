# coding=utf-8
import csv
from sqlalchemy.orm.exc import NoResultFound
import transaction
from nextgisweb import DBSession
from nextgisweb.resource import Resource
from nextgisweb.resource import ResourceGroup
from nextgisweb_compulink.compulink_admin.model import FoclProject, FoclStruct, FoclProjectSerializer, \
    SituationPlanSerializer, FoclStructSerializer
from nextgisweb_compulink.compulink_admin.model import SituationPlan
from nextgisweb_compulink.compulink_admin.view import get_region_id, get_district_id, get_region_name, get_district_name

__author__ = 'yellow'
__license__ = ''
__date__ = '2014'


CSV_REGION_FIELD = 'region'
CSV_DISTRICT_FIELD = 'district'
CSV_FOCL_NAME_FIELD = 'focl_name'
CSV_FOCL_ID = 'focl_id'

class DataStructGenerator():
    '''
    Генератор структур проектов и объектов строительства
    по заданному csv файлу, формата:
    region | district | focl_name | focl_id
    '''
    def __init__(self, csv_file_path, parent_res_id):
        self.csv_file_path = csv_file_path
        self.parent_res_id = parent_res_id


    def check_input(self):
        critical_error = False
        #  check csv file
        with open(self.csv_file_path) as f:
            csv_f = csv.DictReader(f)

            fields = csv_f.fieldnames
            if CSV_REGION_FIELD not in fields \
                    or CSV_DISTRICT_FIELD not in fields \
                    or CSV_FOCL_NAME_FIELD not in fields \
                    or CSV_FOCL_ID not in fields:
                print 'CRITICAL: Check struct of csv file!'
                critical_error = True
                return critical_error

            for row in csv_f:
                region_name = row[CSV_REGION_FIELD]
                distr_name = row[CSV_DISTRICT_FIELD]
                focl_id = row[CSV_FOCL_ID]

                reg_id = get_region_id(region_name)
                if not reg_id:
                    print 'CRITICAL: Region %s not found in dictionary!' % region_name
                    critical_error = True
                    continue

                distr_id = get_district_id(distr_name, reg_id)
                if not distr_id:
                    print 'CRITICAL: District %s not found in dictionary!' % distr_name
                    critical_error = True
                    continue

                # check existing focl_id
                if FoclStruct.filter_by(external_id=focl_id).count() > 0:
                    print 'WARNING: FOCL %s already exists in DB!' % focl_id
        return critical_error

    def get_parent_resource(self, res_id):
        try:
            return ResourceGroup.filter_by(id=res_id).one()
        except NoResultFound:
            return None


    def generate_data(self, force):
        self.session = DBSession
        transaction.manager.begin()

        #parent element
        root_res = self.get_parent_resource(self.parent_res_id)
        if not root_res:
            raise Exception('Parent resource not found!')

        if self.check_input():
            raise Exception('Input data has critical errors! Please check it!')

        with open(self.csv_file_path) as f:
            csv_f = csv.DictReader(f)



            for row in csv_f:
                region_name = row[CSV_REGION_FIELD]
                distr_name = row[CSV_DISTRICT_FIELD]
                focl_id = row[CSV_FOCL_ID]
                focl_name = row[CSV_FOCL_NAME_FIELD]

                # check existing focl_id
                if FoclStruct.filter_by(external_id=focl_id).count() > 0:
                    print 'WARNING: FOCL %s already exists in DB!' % focl_id
                    continue

                reg_id = get_region_id(region_name)
                distr_id = get_district_id(distr_name, reg_id)

                reg_full_name = get_region_name(reg_id)
                dist_full_name = get_district_name(distr_id)

                # get or create group (region)
                try:
                    reg_res = ResourceGroup.filter_by(display_name=reg_full_name, parent=root_res).one()
                except:
                    reg_res = ResourceGroup(parent=root_res,
                                            owner_user=root_res.owner_user,
                                            display_name=reg_full_name)

                # get or create focl project group (district)
                try:
                    dist_res = FoclProject.filter_by(display_name=dist_full_name, parent=reg_res).one()
                except:
                    dist_res = FoclProject(parent=reg_res,
                                           owner_user=root_res.owner_user,
                                           display_name=dist_full_name)
                    dist_res.persist()
                    FoclProjectSerializer.create_focl_project_content(dist_res)


                # create focl project
                vols_struct = FoclStruct(parent=dist_res,
                                         owner_user=dist_res.owner_user,
                                         display_name=focl_name)
                vols_struct.external_id = focl_id
                vols_struct.region = reg_id
                vols_struct.district = distr_id
                vols_struct.persist()
                FoclStructSerializer.create_focl_struct_content(vols_struct)

                self.session.flush()

        transaction.manager.commit()