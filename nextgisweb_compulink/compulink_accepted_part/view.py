# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import print_function
from __future__ import print_function
from __future__ import unicode_literals

from os import path
from .. import compulink_admin

CURR_PATH = path.dirname(__file__)
ADMIN_BASE_PATH = path.dirname(path.abspath(compulink_admin.__file__))
GUID_LENGTH = 32


def setup_pyramid(comp, config):
    # todo: check URL's
    # config.add_route(
    #     'compulink.editor.map',
    #     '/compulink/editor',
    #     client=()).add_view(show_map)
    #
    # config.add_route(
    #     'compulink.player.map',
    #     '/compulink/player',
    #     client=()).add_view(show_map_player)
    pass
