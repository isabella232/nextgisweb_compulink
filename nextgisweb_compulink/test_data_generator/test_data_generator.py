# coding=utf-8
import transaction
from nextgisweb import DBSession
from nextgisweb.resource import Resource
from nextgisweb.resource import ResourceGroup
from nextgisweb_compulink.compulink_admin.model import FoclProject, FoclStruct, FoclProjectSerializer, \
    SituationPlanSerializer, FoclStructSerializer
from nextgisweb_compulink.compulink_admin.model import SituationPlan

__author__ = 'yellow'
__license__ = ''
__date__ = '2014'

class TestDataGenerator():

    def __init__(self, data_source, parent_resource_id, root_res_name, country_id, focl_struct_count):
        self.data_src = data_source
        self.parent_res_id = parent_resource_id
        self.res_name = root_res_name
        self.counry_id = country_id
        self.focl_srtuct_count = focl_struct_count
        pass

    def generate_data(self):
        self.created_structs = 0

        session = DBSession

        #parent element
        root_res = session.query(Resource).get(self.parent_res_id)

        #group of resources
        group_res = ResourceGroup(parent=root_res,
                                  owner_user=root_res.owner_user,
                                  display_name=self.res_name)
        group_res.persist()

        self.create_regions(self.counry_id, group_res)

        transaction.commit()


    def create_regions(self, country_id, parent_group):
        regions = self.data_src.GetRegions(country_id) #22468)  # HARDCODE!!!Russia code in db

        appended_regs = []
        for reg in regions:
            if reg.name in appended_regs or not reg.name:
                continue
            else:
                appended_regs.append(reg.name)
                print reg.name

            reg_group_res = ResourceGroup(parent=parent_group,
                                          owner_user=parent_group.owner_user,
                                          display_name=reg.name)
            reg_group_res.persist()
            self.create_districts(reg.ogc_fid, reg_group_res)

            #check count
            if self.created_structs >= self.focl_srtuct_count:
                break

    def create_districts(self, region_id, reg_group_res):
        districts = self.data_src.GetDistricts(region_id)
        appended_dist = []
        for dist in districts:
            if dist.name in appended_dist or not dist.name:
                continue
            else:
                appended_dist.append(dist.name)
                print '    ', dist.name

            #create focl_proj
            vols_proj = FoclProject(parent=reg_group_res,
                                    owner_user=reg_group_res.owner_user,
                                    display_name=dist.name)
            vols_proj.persist()
            FoclProjectSerializer.create_focl_project_content(vols_proj)

            #create sit_plan
            sit_plan = SituationPlan(parent=vols_proj,
                                     owner_user=vols_proj.owner_user,
                                     display_name=u'Ситуационный план')
            sit_plan.persist()
            SituationPlanSerializer.create_situation_plan_content(sit_plan)

            self.create_focl_structs(dist.ogc_fid, vols_proj)

            #check count
            if self.created_structs >= self.focl_srtuct_count:
                break


    def create_focl_structs(self, district_id, vols_proj):

        points = self.data_src.GetPoints(district_id)
        appended_vols = []
        for point in points:
            if point.name in appended_vols or not point.name:
                continue
            else:
                appended_vols.append(point.name)

            vols_struct = FoclStruct(parent=vols_proj,
                                    owner_user=vols_proj.owner_user,
                                    display_name=u'ВОЛС ' + unicode(point.name))
            vols_struct.persist()
            FoclStructSerializer.create_focl_struct_content(vols_struct)

            #roads = self.data_src.GetRoads(dist.ogc_fid)

            #check count
            self.created_structs += 1
            if self.created_structs >= self.focl_srtuct_count:
                break