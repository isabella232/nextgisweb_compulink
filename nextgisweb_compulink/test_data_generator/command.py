# -*- coding: utf-8 -*-

from nextgisweb.command import Command
from test_data_generator import TestDataGenerator
from osm_data_source import OsmDataSource


@Command.registry.register
class GenerateTestDataCommand():
    identity = 'compulink.test_data'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--conn-str', default='')
        parser.add_argument('--parent-res-id', default='0')
        parser.add_argument('--res-name', default='')
        parser.add_argument('--vols-count', type=int, default=10)
        parser.add_argument('--country-osm-id', type=int)

    @classmethod
    def execute(cls, args, env):
        data_src = OsmDataSource(args.conn_str)
        test_data_gen = TestDataGenerator(data_src,
                                          args.parent_res_id,
                                          args.res_name,
                                          args.country_osm_id,
                                          args.vols_count)
        test_data_gen.generate_data()









