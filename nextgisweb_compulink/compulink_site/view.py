# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from os import path
from pyramid.renderers import render_to_response

CURR_PATH = path.dirname(__file__)


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.site.map',
        '/compulink/map').add_view(show_map)

    config.add_static_view(
        '/compulink/static',
        path.join(CURR_PATH, 'static'), cache_max_age=3600)


def show_map(request):
    values = {}
    return render_to_response('templates/webmap/display.mako', values, request=request)