# -*- coding: utf-8 -*-
from nextgisweb.command import Command
from nextgisweb_compulink.compulink_deviation.deviation_checker import DeviationChecker


@Command.registry.register
class CheckDeviationCommand:
    identity = 'compulink.check_deviation'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        DeviationChecker.run()
