from dateutil.relativedelta import relativedelta
from sqlalchemy import func

from nextgisweb import DBSession
from datetime import datetime, date
import transaction

from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb_compulink.compulink_admin.model import FoclStruct, PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED, \
    ConstructObject
from nextgisweb_compulink.compulink_reporting.model import ConstructionStatusReport, BuiltCable, BuiltAccessPoint, \
    BuiltFosc, BuiltOpticalCross, BuiltSpecTransition
from nextgisweb_log.model import LogEntry


__author__ = 'yellow'

@AbstractReactor.registry.register
class StatusReportReactor(AbstractReactor):
    identity = 'status_report'
    priority = 21

    @classmethod
    def run(cls, env):

        ngw_session = DBSession()

        transaction.manager.begin()

        LogEntry.info('StatusReportReactor started!', component=COMP_ID, group=StatusReportReactor.identity, append_dt=datetime.now())

        # clear all data from table
        ngw_session.query(ConstructionStatusReport).delete()
        ngw_session.flush()

        # fix now dt
        now_dt = date.today()

        # get all focls
        fs_resources = ngw_session.query(FoclStruct).all()

        for fs in fs_resources:
            # create new report string
            report_line = ConstructionStatusReport()

            # get gfocl_info
            try:
                focl_info = ngw_session.query(ConstructObject).filter(ConstructObject.resource_id == fs.id).one()
            except:
                focl_info = None
            
            # save info from resource
            report_line.focl_res_id = fs.id
            report_line.focl_name = fs.display_name
            report_line.status = fs.status

            # save info from focl_info
            if focl_info:
                report_line.cabling_plan = focl_info.cabling_plan
                report_line.ap_plan = focl_info.access_point_plan
                report_line.subcontr_name = focl_info.subcontr_name
                report_line.start_build_time = focl_info.start_build_date
                report_line.end_build_time = focl_info.end_build_date
                report_line.start_deliver_time = focl_info.start_deliver_date
                report_line.end_deliver_time = focl_info.end_deliver_date
                
                report_line.fosc_plan = focl_info.fosc_plan
                report_line.cross_plan = focl_info.cross_plan
                report_line.spec_trans_plan = focl_info.spec_trans_plan

                report_line.region = focl_info.region_id
                report_line.district = focl_info.district_id
            else:
                LogEntry.warning('Not found ConstructObject info for resource %s' % fs.id,
                              component=COMP_ID, group=StatusReportReactor.identity)


            # save from built
            # --- cabling
            # --- --- get fact
            focl_fact_val = ngw_session.query(func.sum(BuiltCable.cable_length))\
                .filter(BuiltCable.resource_id == fs.id).scalar()
            report_line.cabling_fact = round(focl_fact_val, 3) if focl_fact_val else 0

            # --- --- get percenatage
            if not report_line.cabling_plan:
                report_line.cabling_plan = None
            report_line.cabling_percent = cls._get_percentage(report_line.cabling_plan, report_line.cabling_fact)


            # --- fosc
            # --- --- get fact
            fosc_fact_val = ngw_session.query(func.sum(BuiltFosc.fosc_count))\
                .filter(BuiltFosc.resource_id == fs.id).scalar()
            report_line.fosc_fact = fosc_fact_val

            # --- --- get percenatage
            if not report_line.fosc_plan:
                report_line.fosc_plan = None
            report_line.fosc_percent = cls._get_percentage(report_line.fosc_plan, report_line.fosc_fact)


            # --- cross
            # --- --- get fact
            cross_fact_val = ngw_session.query(func.sum(BuiltOpticalCross.optical_cross_count))\
                .filter(BuiltOpticalCross.resource_id == fs.id).scalar()
            report_line.cross_fact = cross_fact_val

            # --- --- get percenatage
            if not report_line.cross_plan:
                report_line.cross_plan = None
            report_line.cross_percent = cls._get_percentage(report_line.cross_plan, report_line.cross_fact)


            # --- spec_trans
            # --- --- get fact
            st_fact_val = ngw_session.query(func.sum(BuiltSpecTransition.spec_trans_count))\
                .filter(BuiltSpecTransition.resource_id == fs.id).scalar()
            report_line.spec_trans_fact = st_fact_val

            # --- --- get percenatage
            if not report_line.spec_trans_plan:
                report_line.spec_trans_plan = None
            report_line.spec_trans_percent = cls._get_percentage(report_line.spec_trans_plan, report_line.spec_trans_fact)


            # --- ap
            # --- --- get fact
            ap_fact_val = ngw_session.query(func.sum(BuiltAccessPoint.access_point_count))\
                .filter(BuiltAccessPoint.resource_id == fs.id).scalar()
            report_line.ap_fact = ap_fact_val

            # --- --- get percenatage
            if not report_line.ap_plan:
                report_line.ap_plan = None
            report_line.ap_percent = cls._get_percentage(report_line.ap_plan, report_line.ap_fact)


            # save overdue status
            if report_line.end_build_time and \
               now_dt > report_line.end_build_time and \
               report_line.status not in [PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED]:
                report_line.is_overdue = True
                report_line.is_month_overdue = now_dt - relativedelta(months=1) > report_line.end_build_time
            else:
                report_line.is_overdue = False
                report_line.is_month_overdue = False

            report_line.persist()
            ngw_session.flush()

        LogEntry.info('StatusReportReactor finished!', component=COMP_ID, group=StatusReportReactor.identity, append_dt=datetime.now())
        transaction.manager.commit()

    @classmethod
    def _get_percentage(cls, plan, fact):
        if plan is None or fact is None:
            percent = None
        elif plan == 0:
            percent = None
        else:
            percent = round(fact/float(plan) * 100.0)
        return percent
