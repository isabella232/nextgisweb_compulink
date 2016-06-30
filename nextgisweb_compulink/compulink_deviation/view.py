# coding=utf-8

from os import path

from nextgisweb import DBSession
from pyramid.httpexceptions import HTTPForbidden
import transaction

from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_deviation.deviation_checker import PROCESSING_LAYER_TYPES
from nextgisweb_compulink.compulink_deviation.model import ConstructDeviation
from nextgisweb_compulink.compulink_reporting.utils import DateTimeJSONEncoder
from nextgisweb_compulink.compulink_reporting.view import get_child_resx_by_parent, get_project_focls, \
    get_user_writable_focls
from nextgisweb_compulink.utils import error_response, success_response

from .deviation_checker import DeviationChecker

CURR_PATH = path.dirname(path.abspath(__file__))
TEMPLATES_PATH = path.join(CURR_PATH, 'templates/')
import json

from pyramid.response import Response

from nextgisweb.resource import (
    Resource,
    ResourceScope,
    DataScope)
from nextgisweb_compulink.compulink_admin.model import FoclStructScope, FoclStruct
from nextgisweb.geometry import geom_from_wkt
from nextgisweb.pyramid import viewargs
from nextgisweb.feature_layer.interface import IFeatureLayer
from nextgisweb.feature_layer.view import ComplexEncoder


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

    config.add_route(
        'compulink.deviation.identify',
        '/compulink/deviation/identify',
        client=()) \
        .add_view(deviation_identify)

    config.add_route(
        'compulink.deviation.apply',
        '/compulink/deviation/apply',
        client=()) \
        .add_view(apply_deviation)


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


def deviation_identify(request):
    sett_name = 'permissions.disable_check.identify'
    setting_disable_check = request.env.core.settings.get(sett_name, 'false').lower()
    if setting_disable_check in ('true', 'yes', '1'):
        setting_disable_check = True
    else:
        setting_disable_check = False

    srs = int(request.json_body['srs'])
    geom = geom_from_wkt(request.json_body['geom'], srid=srs)
    layers = map(int, request.json_body['layers'])

    layer_list = DBSession.query(Resource).filter(Resource.id.in_(layers))

    result = dict()

    # Количество объектов для всех слоев
    feature_count = 0

    for layer in layer_list:
        layer_type = DeviationChecker.get_layer_type(layer)

        if not setting_disable_check and not layer.has_permission(DataScope.read, request.user):
            result[layer.id] = dict(error="Forbidden")

        elif not layer.parent or not (request.user.is_administrator or layer.parent.has_permission(FoclStructScope.approve_deviation, request.user)):
            result[layer.id] = dict(error="Forbidden deviation")

        elif not IFeatureLayer.providedBy(layer):
            result[layer.id] = dict(error="Not implemented")

        elif not layer_type.startswith('actual_real_') or layer_type.replace('actual_real_', '') not in PROCESSING_LAYER_TYPES.keys():
            result[layer.id] = dict(error="Not supported")

        else:
            query = layer.feature_query()
            query.intersects(geom)

            features = [
                dict(id=f.id, layerId=layer.id,
                     label=f.label, fields=f.fields)
                for f in query() if ('is_deviation' in f.fields.keys() and f.fields['is_deviation'] == 1)
            ]

            # Добавляем в результаты идентификации название
            # родительского ресурса (можно использовать в случае,
            # если на клиенте нет возможности извлечь имя слоя по
            # идентификатору)
            if not setting_disable_check:
                allow = layer.parent.has_permission(ResourceScope.read, request.user)
            else:
                allow = True

            if allow:
                for feature in features:
                    feature['parent'] = layer.parent.display_name

            result[layer.id] = dict(
                features=features,
                featureCount=len(features)
            )

            feature_count += len(features)

    result["featureCount"] = feature_count

    return Response(
        json.dumps(result, cls=ComplexEncoder),
        content_type='application/json')


def apply_deviation(request):
    layer_type = request.json_body['layerType']
    layer_id = int(request.json_body['layerId'])
    feature_id = int(request.json_body['featureId'])
    comment = request.json_body['comment']

    ngw_session = DBSession()
    transaction.manager.begin()

    # get layers\focl_structs\etc
    layer = ngw_session.query(VectorLayer).filter_by(VectorLayer.id==layer_id).first()

    if not layer:
        error_response('Layer not found!')

    if not isinstance(layer.parent, FoclStruct):
        error_response('Invalid layer! Layer not in FoclStruct!')

    focl_res_id = layer.parent.id
    layer_type = DeviationChecker.get_layer_type(layer)

    # set approved flag
    # TODO



    return success_response()
