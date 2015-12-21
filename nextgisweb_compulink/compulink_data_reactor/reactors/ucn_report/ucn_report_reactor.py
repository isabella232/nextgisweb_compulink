from datetime import datetime

from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_reporting.report_builder_ucn import ReportBuilderUcn
from nextgisweb_log.model import LogEntry

__author__ = 'yellow'

@AbstractReactor.registry.register
class UcnReportReactor(AbstractReactor):
    identity = 'ucn_report'
    priority = 20

    @classmethod
    def run(cls, env):
        LogEntry.info('UcnReportReactor started!', component=COMP_ID, group=cls.identity, append_dt=datetime.now())
        ReportBuilderUcn.run()
        LogEntry.info('UcnReportReactor finished!', component=COMP_ID, group=cls.identity, append_dt=datetime.now())
