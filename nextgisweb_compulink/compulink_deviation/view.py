# coding=utf-8
import json

from os import path

from nextgisweb.pyramid import viewargs
from nextgisweb import DBSession
from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response

from nextgisweb_compulink.compulink_deviation.model import ConstructDeviation
from nextgisweb_compulink.compulink_reporting.utils import DateTimeJSONEncoder
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
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    # get params
    show_approved = request.params.get('show_approved', None)
    resource_id = request.params.get('resource_id', None)

    # request
    ngw_session = DBSession()
    query = ngw_session.query(ConstructDeviation).order_by(ConstructDeviation.focl_name)

    if not show_approved == 'true':
        query = query.filter(ConstructDeviation.deviation_approved==False)


    # if not request.user.is_administrator:
    #     allowed_res_ids = get_user_writable_focls(request.user)
    #     report_query = report_query.filter(ConstructionStatusReport.focl_res_id.in_(allowed_res_ids))

    row2dict = lambda row: dict((col, getattr(row, col)) for col in row.__table__.columns.keys())
    json_resp = []
    for row in query.all():
        json_resp.append(row2dict(row))

    return Response(json.dumps(json_resp, cls=DateTimeJSONEncoder), content_type=b'application/json')