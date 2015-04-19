# -*- coding: utf-8 -*-

from nextgisweb.command import Command
from data_struct_generator import DataStructGenerator


@Command.registry.register
class GenerateDataStructCommand():
    identity = 'compulink.data_struct_gen'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--csv-file')
        parser.add_argument('--parent-res-id')
        parser.add_argument('--only-check', action='store_true', default=False)
        parser.add_argument('--force', action='store_true', default=False)



    @classmethod
    def execute(cls, args, env):
        struct_gen = DataStructGenerator(args.csv_file, args.parent_res_id)
        if args.only_check:
            struct_gen.check_input()
        else:
            struct_gen.generate_data(args.force)










