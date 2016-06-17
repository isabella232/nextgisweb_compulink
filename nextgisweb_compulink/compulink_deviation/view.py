# coding=utf-8
import json

from os import path

from nextgisweb.pyramid import viewargs
from nextgisweb import DBSession
from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response

from nextgisweb_compulink.compulink_deviation.deviation_checker import PROCESSING_LAYER_TYPES
from nextgisweb_compulink.compulink_deviation.model import ConstructDeviation
from nextgisweb_compulink.compulink_reporting.utils import DateTimeJSONEncoder
from nextgisweb_compulink.compulink_reporting.view import get_child_resx_by_parent, get_project_focls, \
    get_user_writable_focls

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


    if resource_id not in (None, 'root'):
        try:
            resource_id = int(resource_id)
        except:
            return Response(json.dumps({'error': 'Invalid resource_id'}), content_type=b'application/json', status=400)

        project_res_ids = get_project_focls(resource_id)
        query = query.filter(ConstructDeviation.focl_res_id.in_(project_res_ids))

    if not request.user.is_administrator:
        allowed_res_ids = get_user_writable_focls(request.user)
        query = query.filter(ConstructDeviation.focl_res_id.in_(allowed_res_ids))


    row2dict = lambda row: dict((col, getattr(row, col)) for col in row.__table__.columns.keys())
    json_resp = []
    for row in query.all():
        obj_dict = row2dict(row)
        obj_dict['object_type_name'] = PROCESSING_LAYER_TYPES[obj_dict['object_type']]
        json_resp.append(obj_dict)

    return Response(json.dumps(json_resp, cls=DateTimeJSONEncoder), content_type=b'application/json')