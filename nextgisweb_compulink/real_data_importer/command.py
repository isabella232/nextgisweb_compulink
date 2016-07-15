# -*- coding: utf-8 -*-

from nextgisweb.command import Command
from data_struct_importer import DataStructImporter


@Command.registry.register
class ImportDataStructCommand():
    identity = 'compulink.data_struct_import'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--csv-file')
        parser.add_argument('--parent-res-id')
        parser.add_argument('--only-check', action='store_true', default=False)
        parser.add_argument('--force', action='store_true', default=False)
        parser.add_argument('--plain-struct', action='store_true', default=False)

    @classmethod
    def execute(cls, args, env):
        struct_importer = DataStructImporter(args.csv_file, args.parent_res_id)
        if args.only_check:
            struct_importer.check_input()
        else:
            struct_importer.import_data(args.force, args.plain_struct)










