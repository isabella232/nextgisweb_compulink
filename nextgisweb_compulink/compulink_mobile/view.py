# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from datetime import datetime
from pyramid.httpexceptions import HTTPForbidden, HTTPMethodNotAllowed, HTTPBadRequest

from pyramid.response import Response
from pyramid.view import view_config
from sqlalchemy.orm import joinedload

from nextgisweb import DBSession
from ..compulink_admin.model import FoclStruct, PROJECT_STATUS_IN_PROGRESS, PROJECT_STATUS_PROJECT, PROJECT_STATUS_BUILT, \
    PROJECT_STATUSES
from ..compulink_admin.view import get_region_name, get_district_name
from nextgisweb.resource import DataScope
from nextgisweb_lookuptable.model import LookupTable

SYNC_LAYERS_TYPES = [
    #projected
    'fosc',
    'optical_cable',
    'optical_cross',
    'access_point',
    'special_transition',
    #real
    'real_special_transition_point',
    'real_optical_cable_point',
    'real_fosc',
    'real_optical_cross',
    'real_access_point',
]

MOBILE_PROJECT_STATYSES = {
    PROJECT_STATUS_PROJECT: 'Строительство не начато',
    PROJECT_STATUS_IN_PROGRESS: 'Идет строительство',
    PROJECT_STATUS_BUILT: 'Построено'
}

def setup_pyramid(comp, config):
    config.add_route(
        'compulink.mobile.focl_list',
        '/compulink/mobile/user_focl_list').add_view(get_user_focl_list)
    config.add_route(
        'compulink.mobile.all_dicts',
        '/compulink/mobile/all_dicts').add_view(get_all_dicts)
    config.add_route(
        'compulink.mobile.set_focl_status',
        '/compulink/mobile/set_focl_status').add_view(set_focl_status)


@view_config(renderer='json')
def get_user_focl_list(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    # TODO: Now - very simple variant. Linear alg.
    # TODO: Maybe need tree walking!!!

    dbsession = DBSession()

    resources = dbsession.query(FoclStruct).options(joinedload('children'))\
        .filter(FoclStruct.status.in_([PROJECT_STATUS_IN_PROGRESS, PROJECT_STATUS_PROJECT])).all()

    focl_list = []
    for resource in resources:
        if not resource.has_permission(DataScope.write, request.user):
            continue

        focl = {
            'id': resource.id,
            'name': resource.display_name,
            'region': get_region_name(resource.region),
            'district': get_district_name(resource.district),
            'status': resource.status,
            'layers': []
        }

        for child in resource.children:
            for layer_type in SYNC_LAYERS_TYPES:
                if child.keyname and child.keyname.startswith(layer_type):
                    suitable_layer = {
                        'id': child.id,
                        'name': child.display_name,
                        'type': layer_type
                    }
                    focl['layers'].append(suitable_layer)
                    break

        focl_list.append(focl)

    dbsession.close()
    return Response(json.dumps(focl_list))

@view_config(renderer='json')
def get_all_dicts(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    dbsession = DBSession()
    dicts_resources = dbsession.query(LookupTable).all()

    dicts = {}
    for dict_res in dicts_resources:
        dicts[dict_res.keyname] = dict_res.val

    # add project statuses dict
    dicts['proj_statuses'] = MOBILE_PROJECT_STATYSES

    dbsession.close()

    return Response(json.dumps(dicts))



@view_config(renderer='json')
def set_focl_status(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    if request.method != 'PUT':
        raise HTTPMethodNotAllowed()

    params = request.json_body

    if not params \
            or 'id' not in params.keys() \
            or 'status' not in params.keys() \
            or 'update_dt' not in params.keys()\
            or not params['id']\
            or params['status'] not in MOBILE_PROJECT_STATYSES:
        raise HTTPBadRequest()

    dbsession = DBSession()

    resource = dbsession.query(FoclStruct).filter(FoclStruct.id == params['id']).all()[0]
    if not resource:
        raise HTTPBadRequest('No FoclStruct with such id!')

    if not resource.has_permission(DataScope.write, request.user):
        raise HTTPForbidden()

    resource.status = params['status']
    resource.status_upd_dt = datetime.utcfromtimestamp(params['update_dt'])
    #resource.persist()
    dbsession.flush()
    #dbsession.close()

    return Response('')
