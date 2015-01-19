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
    'telecom_cabinet',
    'pole',
    'endpoint',
]


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.mobile.focl_list',
        '/compulink/mobile/user_focl_list').add_view(get_user_focl_list)


@view_config(renderer='json')
def get_user_focl_list(request):

    dbsession = DBSession()
    #TODO: permission check. Now only for Kursk hardcode!!!
    parent_res = dbsession.query(Resource).filter(Resource.id == 80373).first()
    #resources = dbsession.query(Resource).filter(Resource.parent == parent_res).filter(Resource.identity == FoclStruct.identity).all()
    resources = parent_res.children

    focl_list = []
    for resource in resources:
        if resource.identity != FoclStruct.identity:
            continue

        focl = {
            'id': resource.id,
            'name': resource.display_name,
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