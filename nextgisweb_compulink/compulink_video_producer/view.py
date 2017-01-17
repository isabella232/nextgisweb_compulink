# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import print_function
from __future__ import print_function
from __future__ import unicode_literals

import json

from pyramid.response import Response

from nextgisweb_compulink.utils import success_response


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.player.video.crud',
        '/compulink/player/video',
        client=('layer_type', 'construct_object_id', 'accepted_part_id',)) \
        .add_view(get_video_list, request_method='GET') \
        .add_view(make_video, request_method='DELETE') \
        .add_view(remove_video, request_method='POST')


def get_video_list(request):
    # todo: get user info by session info and implement other logic
    return Response(json.dumps([
        {
            'id': 1,
            'name': u'Видео 15/01/2017',
            'size': u'1 Мб',
            'url': '#',
            'created_date_time': 1484482931,
            'status': 'ready'
        },
        {
            'id': 2,
            'name': u'Видео 18/01/2017',
            'size': None,
            'url': None,
            'created_date_time': None,
            'status': 'creating'
        },
        {
            'id': 3,
            'name': u'Видео 17/01/2017',
            'size': u'3 Мб',
            'url': '#',
            'created_date_time': 1484680941,
            'status': 'ready'
        }
    ]))


def make_video(request):
    # todo: get user info by session info and implement other logic
    return success_response()


def remove_video(request):
    # todo: get user info by session info and implement other logic
    return success_response()
