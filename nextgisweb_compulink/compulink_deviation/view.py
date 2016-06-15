# coding=utf-8
from nextgisweb_compulink.compulink_reporting.view import get_child_resx_by_parent


def setup_pyramid(comp, config):

    config.add_route(
        'compulink.deviation.status_grid',
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


def deviation_grid(request):
    pass

def get_deviation_data(request):
    pass