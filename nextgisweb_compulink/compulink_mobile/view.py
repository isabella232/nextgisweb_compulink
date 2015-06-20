# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from pyramid.httpexceptions import HTTPForbidden

from pyramid.response import Response
from pyramid.view import view_config
from sqlalchemy.orm import joinedload

from nextgisweb import DBSession
from ..compulink_admin.model import FoclStruct, PROJECT_STATUS_IN_PROGRESS
from ..compulink_admin.view import get_region_name, get_district_name

SYNC_LAYERS_TYPES = [
    #projected
    'fosc',
    'optical_cable',
    'optical_cross',
    'access_point',
    'endpoint',
    #real
    'real_special_transition_point',
    'real_optical_cable_point',
    'real_fosc',
    'real_optical_cross',
    'real_access_point',
]


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.mobile.focl_list',
        '/compulink/mobile/user_focl_list').add_view(get_user_focl_list)


@view_config(renderer='json')
def get_user_focl_list(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    # TODO: Now - very simple variant. Linear alg.
    # TODO: Maybe need tree walking!!!

    dbsession = DBSession()

    #parent_res = dbsession.query(Resource).get(0)
    #resources = parent_res.children

    resources = dbsession.query(FoclStruct).options(joinedload('children')).filter(FoclStruct.status == PROJECT_STATUS_IN_PROGRESS).all()

    focl_list = []
    for resource in resources:
        # TODO: permission check
        #if not resource.has_permission(???):
        #   continue

        focl = {
            'id': resource.id,
            'name': resource.display_name,
            'region': get_region_name(resource.region),
            'district': get_district_name(resource.district),
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