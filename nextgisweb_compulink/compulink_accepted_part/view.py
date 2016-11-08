# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import print_function
from __future__ import print_function
from __future__ import unicode_literals

import json

from nextgisweb import DBSession
from nextgisweb.resource import Resource
from nextgisweb.resource.serialize import CompositeSerializer
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.utils import error_response
from pyramid.response import Response
from pyramid.view import view_config


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.get_layer_info',
        '/compulink/accepted-parts/layer-info/{layer_type}/{construct_object_id:\d+}',
        client=('layer_type', 'construct_object_id',)).add_view(get_layer_info)


@view_config(renderer='json')
def get_layer_info(request):
    construct_object_id = request.matchdict['construct_object_id']
    layer_type = request.matchdict['layer_type']

    session = DBSession()
    resource = session.query(Resource).filter(Resource.id == construct_object_id).first()
    layer_info = get_vector_layer_by_layer_type(resource, layer_type)

    if not layer_info:
        return error_response(u'Слой типа "%s" не найден'.format(layer_type))

    serializer = CompositeSerializer(layer_info, request.user)
    serializer.serialize()

    return Response(json.dumps(serializer.data))


def get_vector_layer_by_layer_type(resource, layer_type):
    layer = None
    for child_resource in resource.children:
        if child_resource.identity != VectorLayer.identity:
            continue
        resource_layer_type = '_'.join(child_resource.keyname.rsplit('_')[0:-1])
        if layer_type == resource_layer_type:
            layer = child_resource
            break
    return layer
