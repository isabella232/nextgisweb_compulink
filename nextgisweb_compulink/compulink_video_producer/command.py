# -*- coding: utf-8 -*-
from nextgisweb_compulink.compulink_video_producer.default_video_page import DefaultVideoPage, UNITS
from nextgisweb_compulink.compulink_video_producer.video_options import VideoOptions
from nextgisweb_compulink.compulink_video_producer.video_producer import VideoProducer
from nextgisweb.command import Command


@Command.registry.register
class ProduceVideoCommand():
    identity = 'compulink.produce_video'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--res-id', required=True, type=int)
        parser.add_argument('--out-path', required=True, type=str)

    @classmethod
    def execute(cls, args, env):
        # TEST 18537 18395
        vo = VideoOptions()
        vo.sound_enabled = False

        vp = DefaultVideoPage(args.res_id, units=UNITS[2])

        video_producer = VideoProducer()
        video_producer.make_video(vp, vo, args.out_path)


