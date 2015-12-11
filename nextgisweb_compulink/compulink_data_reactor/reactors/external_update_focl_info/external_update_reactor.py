from datetime import datetime

import transaction
from sqlalchemy import func
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession as NgwSession
from nextgisweb_compulink.compulink_admin.model import ConstructObject
from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_mssql_bridge import CompulinkMssqlBridgeComponent, DBSession as MsSqlSession
from nextgisweb_compulink.compulink_mssql_bridge.model import ConstructObjects as MssqConstObject
from nextgisweb_log.model import LogEntry

__author__ = 'yellow'

@AbstractReactor.registry.register
class ExternalUpdateReactor(AbstractReactor):
    identity = 'external_update_reactor'
    priority = 10

    @classmethod
    def run(cls, env):

        ngw_session = NgwSession()
        ms_session = MsSqlSession()

        transaction.manager.begin()

        LogEntry.info('ExternalUpdateReactor started!', component=COMP_ID, group=ExternalUpdateReactor.identity, append_dt=datetime.now())

        # get mssql conn info
        enabled_sett = env.compulink_mssql_bridge.settings.get('enable', 'false').lower()
        mssql_enable = enabled_sett in ('true', 'yes', '1')

        if not mssql_enable:
            LogEntry.info('MSSQL disabled in config! Returning...', component=COMP_ID, group=ExternalUpdateReactor.identity, append_dt=datetime.now())
            return

        # get all external ids
        fs_external_ids = ngw_session.query(ConstructObject.external_id).filter(ConstructObject.external_id != None, ConstructObject.external_id != '').all()
        fs_external_ids = [r for (r,) in fs_external_ids]

        # get info from mssql
        CompulinkMssqlBridgeComponent.configure_db_conn(env.compulink_mssql_bridge.settings.get('conn_str', 'no'))
        ms_rows = ms_session.query(MssqConstObject)\
            .filter(MssqConstObject.ObjectID.in_(fs_external_ids))\
            .options(joinedload_all(MssqConstObject.Work3), joinedload_all(MssqConstObject.Work4)).all()

        for ms_row in ms_rows:
            # get const obj
            try:
                const_obj = ngw_session.query(ConstructObject).filter(ConstructObject.external_id == str(ms_row.ObjectID)).one()
            except:
                LogEntry.info('Error on update const obj with ext id = ' + str(ms_row.ObjectID),
                              component=COMP_ID, group=ExternalUpdateReactor.identity, append_dt=datetime.now())
                continue

            # update from mssql
            const_obj.cabling_plan = ms_row.PreliminaryLineLength     #new requ TODO: check!
            const_obj.access_point_plan = ms_row.AccessPointAmount              #new requ
            const_obj.subcontr_name = ms_row.Work3.SubContractor.ContractorName if ms_row.Work3 and ms_row.Work3.SubContractor else None
            const_obj.start_build_date = ms_row.Work3.AgreementStartDateWork if ms_row.Work3 else None
            const_obj.end_build_date = ms_row.Work3.AgreementFinishDateWork if ms_row.Work3 else None
            const_obj.start_deliver_date = ms_row.Work4.AgreementStartDateWork if ms_row.Work4 else None
            const_obj.end_deliver_date = ms_row.Work4.AgreementFinishDateWork if ms_row.Work4 else None

        ngw_session.flush()
        LogEntry.info('StatusReportReactor finished!', component=COMP_ID, group=ExternalUpdateReactor.identity, append_dt=datetime.now())

        transaction.manager.commit()
