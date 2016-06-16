# coding=utf-8
from os import path

from nextgisweb.pyramid import viewargs
from pyramid.httpexceptions import HTTPForbidden

from nextgisweb_compulink.compulink_reporting.view import get_child_resx_by_parent

CURR_PATH = path.dirname(path.abspath(__file__))
TEMPLATES_PATH = path.join(CURR_PATH, 'templates/')


def setup_pyramid(comp, config):

    config.add_route(
        'compulink.deviation.grid',
        '/compulink/deviation/grid') \
        .add_view(deviation_grid)

    config.add_route(
        'compulink.deviation.get_deviation_data',
        '/compulink/deviation/get_deviation_data',
        client=()) \
        .add_view(get_deviation_data)

    config.add_route(
        'compulink.deviation.building_objects',
        '/compulink/deviation/resources/child',
        client=()) \
        .add_view(get_child_resx_by_parent)


@viewargs(renderer='nextgisweb_compulink:compulink_deviation/templates/deviation_grid.mako')
def deviation_grid(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()
    return dict(
        show_header=True,
        request=request
    )


def get_deviation_data(request):
    pass
