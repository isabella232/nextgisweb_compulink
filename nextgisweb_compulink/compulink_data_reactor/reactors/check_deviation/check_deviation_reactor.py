from datetime import datetime

from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_deviation.deviation_checker import DeviationChecker
from nextgisweb_log.model import LogEntry

__author__ = 'yellow'

@AbstractReactor.registry.register
class CheckDeviationReactor(AbstractReactor):
    identity = 'check_deviation'
    priority = 30

    @classmethod
    def run(cls, env):
        LogEntry.info('CheckDeviationReactor started!', component=COMP_ID, group=cls.identity, append_dt=datetime.now())
        DeviationChecker.run()
        LogEntry.info('CheckDeviationReactor finished!', component=COMP_ID, group=cls.identity, append_dt=datetime.now())
