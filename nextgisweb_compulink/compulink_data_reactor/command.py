# -*- coding: utf-8 -*-
from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb.command import Command

from .reactors.construct_focl_line_reactor import ConstructFoclLineReactor  # NOQA
from .reactors.test2 import Reactor2  # NOQA


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