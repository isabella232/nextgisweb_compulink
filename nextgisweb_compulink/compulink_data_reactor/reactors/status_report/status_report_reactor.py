from nextgisweb import DBSession as NgwSession
from datetime import datetime, date
from nextgisweb_compulink.compulink_mssql_bridge import CompulinkMssqlBridgeComponent, DBSession as MsSqlSession
import transaction
from sqlalchemy.orm import joinedload_all

from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb_compulink.compulink_admin.model import FoclStruct, PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED
from nextgisweb_compulink.compulink_mssql_bridge.model import ConstructObjects
from nextgisweb_compulink.compulink_reporting.model import ConstructionStatusReport

from nextgisweb_log.model import LogEntry


__author__ = 'yellow'

@AbstractReactor.registry.register
class StatusReportReactor(AbstractReactor):
    identity = 'status_report'
    priority = 1

    @classmethod
    def run(cls, env):
        LogEntry.info('StatusReportReactor started!', component=COMP_ID, group=StatusReportReactor.identity)

        ngw_session = NgwSession()
        ms_session = MsSqlSession()
        transaction.manager.begin()

        # clear all data from table
        ngw_session.query(ConstructionStatusReport).delete()
        ngw_session.flush()

        # fix now dt
        now_dt = date.today()

        # get mssql info
        mssql_enable = env.compulink_mssql_bridge.settings.get('enable', False)

        ms_info = dict()
        if mssql_enable:
            CompulinkMssqlBridgeComponent.configure_db_conn(env.compulink_mssql_bridge.settings.get('conn_str', 'no'))

            fs_external_ids = ngw_session.query(FoclStruct.external_id).all()
            ms_rows = ms_session.query(ConstructObjects).filter(ConstructObjects.ObjectID.in_(fs_external_ids)).options(joinedload_all(ConstructObjects.Work3)).all()
            for row in ms_rows:
                if row.ObjectID not in ms_info.keys():
                    ms_info[str(row.ObjectID)] = row

        # get all focls
        fs_resources = ngw_session.query(FoclStruct).all()

        for fs in fs_resources:
            # create new report string
            report_line = ConstructionStatusReport()

            # save info from resource
            report_line.focl_res_id = fs.id
            report_line.external_id = fs.external_id
            report_line.focl_name = fs.display_name
            report_line.region = fs.region
            report_line.district = fs.district
            report_line.status = fs.status

            # save info from mssql
            if report_line.external_id and report_line.external_id in ms_info.keys():
                ms_row = ms_info[report_line.external_id]
                report_line.subcontr_name = ms_row.Work3.SubContractor.ContractorName if ms_row.Work3 and ms_row.Work3.SubContractor else None
                report_line.start_build_time = ms_row.Work3.AgreementStartDateWork if ms_row.Work3 else None
                report_line.end_build_time = ms_row.Work3.AgreementFinishDateWork if ms_row.Work3 else None
            else:
                LogEntry.warning('Not found mssql info for resource %s (external_id is %s)' % (report_line.id, report_line.external_id),
                              component=COMP_ID,
                              group=StatusReportReactor.identity)


            # save statistics
            # --- cabling
            plan, fact, percent = cls.get_plan_fact_length(fs, 'optical_cable', 'real_optical_cable')
            report_line.cabling_plan = plan
            report_line.cabling_fact = fact
            report_line.cabling_percent = percent

            # --- fosc
            plan, fact, percent = cls.get_plan_fact_counts(fs, 'fosc', 'real_fosc')
            report_line.fosc_plan = plan
            report_line.fosc_fact = fact
            report_line.fosc_percent = percent

            # --- cross
            plan, fact, percent = cls.get_plan_fact_counts(fs, 'optical_cross', 'real_optical_cross')
            report_line.cross_plan = plan
            report_line.cross_fact = fact
            report_line.cross_percent = percent

            # --- spec_trans
            plan, fact, percent = cls.get_plan_fact_counts(fs, 'special_transition', 'real_special_transition')
            report_line.spec_trans_plan = plan
            report_line.spec_trans_fact = fact
            report_line.spec_trans_percent = percent

            # --- ap
            plan, fact, percent = cls.get_plan_fact_counts(fs, 'access_point', 'real_access_point')
            report_line.ap_plan = plan
            report_line.ap_fact = fact
            report_line.ap_percent = percent

            # save overdue status
            if report_line.end_build_time and \
               now_dt > report_line.end_build_time and \
               report_line.status not in [PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED]:
                report_line.is_overdue = True
            else:
                report_line.is_overdue = False

            report_line.persist()
            ngw_session.flush()

        transaction.manager.commit()

        LogEntry.info('StatusReportReactor finished!', component=COMP_ID, group=StatusReportReactor.identity)




    @classmethod
    def get_feat_count(cls, layer):
        #tableinfo = TableInfo.from_layer(layer)
        #tableinfo.setup_metadata(tablename=layer._tablename)
        #NgwSession.query(tableinfo.model).count()

        query = layer.feature_query()
        result = query()
        return result.total_count


    @classmethod
    def get_plan_fact_counts(cls, focl_struct, plan_layer_name, fact_layer_name):
        plan_lyr = [lyr for lyr in focl_struct.children if lyr.keyname and lyr.keyname.startswith(plan_layer_name)]
        plan_lyr = plan_lyr[0] if len(plan_lyr) else None

        real_lyr = [lyr for lyr in focl_struct.children if lyr.keyname and lyr.keyname.startswith(fact_layer_name)]
        real_lyr = real_lyr[0] if len(real_lyr) else None

        if plan_lyr:
            plan_count = cls.get_feat_count(plan_lyr)
        else:
            plan_count = None

        if real_lyr:
            real_count = cls.get_feat_count(real_lyr)
        else:
            real_count = None

        if real_count is None or plan_count is None:
            percent = None
        elif plan_count == 0:
            percent = 0
        else:
            percent = real_count/plan_count * 100

        return plan_count, real_count, percent


    @classmethod
    def get_feat_length(cls, layer):
        query = layer.feature_query()
        query.geom()
        result = query()

        if result.total_count < 1:
            return 0  # or None?
        else:
            total_length = 0
            for feat in result:
                geom = feat.geom
                total_length += geom.length  # TODO: need transform + elipsoid len!
            return total_length


    @classmethod
    def get_plan_fact_length(cls, focl_struct, plan_layer_name, fact_layer_name):
        plan_lyr = [lyr for lyr in focl_struct.children if lyr.keyname and lyr.keyname.startswith(plan_layer_name)]
        plan_lyr = plan_lyr[0] if len(plan_lyr) else None

        real_lyr = [lyr for lyr in focl_struct.children if lyr.keyname and lyr.keyname.startswith(fact_layer_name)]
        real_lyr = real_lyr[0] if len(real_lyr) else None

        if plan_lyr:
            plan_length = cls.get_feat_length(plan_lyr)
        else:
            plan_length = None

        if real_lyr:
            real_length = cls.get_feat_length(real_lyr)
        else:
            real_length = None

        if real_length is None or plan_length is None:
            percent = None
        elif plan_length == 0:
             percent = 0
        else:
             percent = real_length/plan_length * 100

        return plan_length, real_length, percent