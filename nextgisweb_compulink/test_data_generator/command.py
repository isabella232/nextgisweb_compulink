# -*- coding: utf-8 -*-
from sqlalchemy.orm import sessionmaker
import transaction

from nextgisweb.command import Command
from nextgisweb.resource import Resource, ResourceGroup
from nextgisweb.models import declarative_base, DBSession
from nextgisweb_compulink.compulink_admin.model import FoclProject, SituationPlan, FoclStruct

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
        appended_regs = []
        for reg in regions:
            if reg.name in appended_regs or not reg.name:
                continue
            else:
                appended_regs.append(reg.name)

            print reg.ogc_fid, ' ', reg.name

            reg_group_res = ResourceGroup(parent=group_res, owner_user=group_res.owner_user, display_name=reg.name)
            reg_group_res.persist()

            districts = data_src.GetDistricts(reg.ogc_fid)
            appended_dist = []
            for dist in districts:
                print '    ', dist.ogc_fid, ' ', dist.name

                if dist.name in appended_dist or not dist.name:
                    continue
                else:
                    appended_dist.append(dist.name)

                vols_proj = FoclProject(parent=reg_group_res, owner_user=reg_group_res.owner_user, display_name=dist.name)
                vols_proj.persist()

                sit_plan = SituationPlan(parent=vols_proj, owner_user=vols_proj.owner_user, display_name='Ситуационный план')
                sit_plan.persist()

                points = data_src.GetPoints(dist.ogc_fid)
                appended_vols = []
                for point in points:
                    if point.name in appended_vols or not point.name:
                        continue
                    else:
                        appended_vols.append(point.name)

                    vols_strut = FoclStruct(parent=vols_proj, owner_user=vols_proj.owner_user, display_name=u'ВОЛС ' + unicode(point.name))
                    vols_strut.persist()

                    #check
                    created_structs += 1
                    if created_structs >= args.vols_count:
                        break
                #roads = data_src.GetRoads(dist.ogc_fid)


                #check
                created_structs += 1
                if created_structs >= args.vols_count:
                    break

            if created_structs >= args.vols_count:
                break

        transaction.commit()







