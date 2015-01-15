# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
import codecs
from os import path
from pyramid.renderers import render_to_response
from pyramid.response import Response
from pyramid.view import view_config
from nextgisweb import DBSession
from nextgisweb.resource import Resource, ResourceGroup
from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT
import nextgisweb_compulink.compulink_admin
from ..compulink_admin.model import SituationPlan, FoclStruct, FoclProject

CURR_PATH = path.dirname(__file__)
ADMIN_BASE_PATH = path.dirname(path.abspath(nextgisweb_compulink.compulink_admin.__file__))


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.site.map',
        '/compulink/monitoring_map').add_view(show_map)

    config.add_route(
        'compulink.site.json',
        '/compulink/resources/child').add_view(get_child_resx_by_parent)

    config.add_static_view(
        name='compulink/static',
        path='nextgisweb_compulink:compulink_site/static', cache_max_age=3600)


@view_config(renderer='json')
def get_child_resx_by_parent(request):
    parent_resource_id = request.params['id'].replace('res_', '')
    is_root_node_requsted = parent_resource_id == '#'

    if is_root_node_requsted:
        parent_resource_id = None

    dbsession = DBSession()
    if parent_resource_id:
        parent_resource = dbsession.query(Resource).get(parent_resource_id)
        children = parent_resource.children
    else:
        children = dbsession.query(Resource).filter(Resource.parent==None).all()
    dbsession.close()

    child_resources_json = []
    for child_resource in children:
        if child_resource.identity in (
                ResourceGroup.identity,
                SituationPlan.identity,
                FoclStruct.identity,
                FoclProject.identity):
            child_resources_json.append({
                'id': 'res_' + str(child_resource.id),
                'text': child_resource.display_name,
                'children': True
            })

    return Response(json.dumps(child_resources_json))


def show_map(request):
    focl_layers_type = get_focl_layers_list()
    sit_plan_layers_type = get_sit_plan_layers_list()
    values = dict(custom_layout=True, focl_layers_type=focl_layers_type, sit_plan_layers_type=sit_plan_layers_type)
    return render_to_response('nextgisweb_compulink:compulink_site/templates/monitoring_webmap/display.mako', values, request=request)


def get_focl_layers_list():
    layers_template_path = path.join(ADMIN_BASE_PATH, 'layers_templates/')

    layers = []

    for vl_name in FOCL_LAYER_STRUCT:
            with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                layers.append({'name': json_layer_struct['resource']['display_name'], 'type': vl_name})

    return layers


def get_sit_plan_layers_list():
    layers_template_path = path.join(ADMIN_BASE_PATH, 'situation_layers_templates/')

    layers = []

    for vl_name in SIT_PLAN_LAYER_STRUCT:
            with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                layers.append({'name': json_layer_struct['resource']['display_name'], 'type': vl_name})

    return layers