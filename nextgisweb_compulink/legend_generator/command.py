# -*- coding: utf-8 -*-
from os import path

from nextgisweb.command import Command
from legend_generator import LegendGenerator

BASE_PATH = path.abspath(path.dirname(__file__))

@Command.registry.register
class GenerateLegendCommand():
    identity = 'compulink.legend'

    @classmethod
    def argparser_setup(cls, parser, env):
        def_path = path.join(BASE_PATH, path.pardir, 'compulink_site/',  'static/img/legend.png')
        parser.add_argument('--out-path', default=def_path)

    @classmethod
    def execute(cls, args, env):
        generator = LegendGenerator(env)
        generator.generate(args.out_path)









