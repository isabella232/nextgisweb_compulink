# -*- coding: utf-8 -*-
from sqlalchemy.orm import sessionmaker

from nextgisweb.command import Command
from nextgisweb.resource import Resource, ResourceGroup
from nextgisweb.models import declarative_base, DBSession
from nextgisweb_compulink.compulink_admin.model import FoclProject, SituationPlan

from osm_data_source import OsmDataSource


@Command.registry.register
class GenerateTestDataCommand():
    identity = 'compulink.test_data'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--conn-str', default='', help='')
        parser.add_argument('--parent-res-id', default='0', help='')
        parser.add_argument('--res-name', default='', help='')
        parser.add_argument('--vols-count', type=int, default=10, help='')

    @classmethod
    def execute(cls, args, env):
        data_src = OsmDataSource(args.conn_str)


        #Session = sessionmaker(bind=DBSession.connection())
        session = DBSession  #  Session()

        root_res = session.query(Resource).get(args.parent_res_id)

        group_res = ResourceGroup(parent=root_res, owner_user=root_res.owner_user, display_name=args.res_name)
        #group_res.
        group_res.persist()


        regions = data_src.GetRegions(22468)  # HARDCODE!!!Russia code in db
        created_structs = 0
        for reg in regions:
            print reg.ogc_fid, ' ', reg.name

            reg_group_res = ResourceGroup(parent=group_res, owner_user=group_res.owner_user, display_name=reg.name)
            reg_group_res.persist()

            districts = data_src.GetDistricts(reg.ogc_fid)
            appended_dist = []
            for dist in districts:
                print '    ', dist.ogc_fid, ' ', dist.name

                if dist.name in appended_dist:
                    continue
                else:
                    appended_dist.append(dist.name)

                vols_proj = FoclProject(parent=reg_group_res, owner_user=reg_group_res.owner_user, display_name=dist.name)
                vols_proj.persist()

                sit_plan = SituationPlan(parent=vols_proj, owner_user=vols_proj.owner_user, display_name='Ситуационный план')
                sit_plan.persist()

                #roads = data_src.GetRoads(dist.ogc_fid)
                #points = data_src.GetPoints(dist.ogc_fid)

                #check
                created_structs += 1
                if created_structs >= args.vols_count:
                    break

            if created_structs >= args.vols_count:
                break

        session.flush()
        tra







