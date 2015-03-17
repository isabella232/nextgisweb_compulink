# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json

from pyramid.response import Response
from pyramid.view import view_config

from nextgisweb import DBSession
from nextgisweb.resource import Resource
from ..compulink_admin.model import FoclStruct

SYNC_LAYERS_TYPES = [
    'fosc',
    'optical_cable',
    'optical_cross',
    'access_point',
    'endpoint',
]


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.mobile.focl_list',
        '/compulink/mobile/user_focl_list').add_view(get_user_focl_list)


@view_config(renderer='json')
def get_user_focl_list(request):
    # TODO: Now - very simple variant. Linear alg.
    # TODO: Maybe need tree walking!!!

    dbsession = DBSession()

    #parent_res = dbsession.query(Resource).get(0)
    #resources = parent_res.children

    resources = dbsession.query(Resource).filter(Resource.cls == FoclStruct.identity).all()

    focl_list = []
    for resource in resources:
        # TODO: permission check
        #if not resource.has_permission(???):
        #   continue

        focl = {
            'id': resource.id,
            'name': resource.display_name,
            'region': resource.region,
            'district': resource.district,
            'layers': []
        }

        for child in resource.children:
            for layer_type in SYNC_LAYERS_TYPES:
                if child.keyname and layer_type in child.keyname:
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