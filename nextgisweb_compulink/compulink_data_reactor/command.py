# -*- coding: utf-8 -*-
from .reactors.abstract_reactor import AbstractReactor
from nextgisweb.command import Command

from .reactors.construct_focl_line.construct_focl_line_reactor import ConstructFoclLineReactor  # NOQA
from .reactors.construct_spec_transition_line.construct_spec_transition_line_reactor import ConstructSpecTransitionLineReactor  # NOQA
from .reactors.status_report.status_report_reactor import StatusReportReactor # NOQA
from .reactors.ucn_report.ucn_report_reactor import UcnReportReactor # NOQA
from .reactors.external_update_focl_info.external_update_reactor import ExternalUpdateReactor # NOQA


@Command.registry.register
class DataReactorCommand():
    identity = 'compulink.run_data_reactor'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--reactor',
                            required=False,
                            choices=AbstractReactor.registry._dict.keys())

    @classmethod
    def execute(cls, args, env):
        if args.reactor:
            reactor_id = args.reactor
            AbstractReactor.registry.get(reactor_id).run(env)
        else:
            reactors = [reactor for reactor in AbstractReactor.registry]
            reactors = sorted(reactors, key=lambda x: x.priority)
            for reactor in reactors:
                reactor.run(env)
