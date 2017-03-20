# -*- coding: utf-8 -*-
from datetime import datetime, timedelta

from nextgisweb_compulink.compulink_video_producer.default_video_page import DefaultVideoPage, UNITS
from nextgisweb_compulink.compulink_video_producer.model import VideoProduceTask
from nextgisweb_compulink.compulink_video_producer.video_options import VideoOptions
from nextgisweb_compulink.compulink_video_producer.video_producer import VideoProducer
from nextgisweb_compulink.compulink_video_producer.view import remove_video_entry
from nextgisweb.command import Command


@Command.registry.register
class RemoveOutdatedVideoCommand():
    identity = 'compulink.remove_outdated_video'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        days = int(env.compulink_video_producer.settings.get('video_outdated_period', 7))
        tasks = VideoProduceTask.filter(VideoProduceTask.creation_dt < datetime.now() - timedelta(days=days))
        c = 0
        for task in tasks:
            remove_video_entry(task.id)
            c += 1
        print('Video removed: ' + str(c))


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

        vp = DefaultVideoPage(args.res_id) #, units=UNITS[2]

        video_producer = VideoProducer()
        video_producer.make_video(vp, vo, args.out_path)


