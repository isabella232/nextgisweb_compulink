# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
import codecs
from os import path
from pyramid.renderers import render_to_response
from pyramid.response import Response
from pyramid.view import view_config
from sqlalchemy.orm import joinedload_all
import sqlalchemy.sql as sql
from nextgisweb import DBSession
from nextgisweb import db
from nextgisweb.resource import Resource, ResourceGroup
from nextgisweb.vector_layer import VectorLayer, TableInfo
from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT
import nextgisweb_compulink.compulink_admin
from ..compulink_admin.model import SituationPlan, FoclStruct, FoclProject
from shapely.wkt import loads

CURR_PATH = path.dirname(__file__)
ADMIN_BASE_PATH = path.dirname(path.abspath(nextgisweb_compulink.compulink_admin.__file__))


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.site.map',
        '/compulink/monitoring_map').add_view(show_map)

    config.add_route(
        'compulink.site.json',
        '/compulink/resources/child').add_view(get_child_resx_by_parent)

    config.add_route(
        'compulink.site.focl_info',
        '/compulink/resources/focl_info').add_view(get_focl_info)

    config.add_route(
        'compulink.site.focl_extent',
        '/compulink/resources/focl_extent').add_view(get_focl_extent)

    config.add_route(
        'compulink.site.layers_by_type',
        '/compulink/resources/layers_by_type').add_view(get_layers_by_type)


    config.add_static_view(
        name='compulink/static',
        path='nextgisweb_compulink:compulink_site/static', cache_max_age=3600)


@view_config(renderer='json')
def get_child_resx_by_parent(request):
    parent_resource_id = request.params['id'].replace('res_', '')
    is_root_node_requsted = parent_resource_id == '#'

    if 'type' in request.params:
        type_filter = request.params['type']
    else:
        type_filter = None

    dbsession = DBSession()
    if is_root_node_requsted:
        parent_resource_id = dbsession.query(Resource).filter(Resource.parent==None).all()[0].id

    parent_resource = dbsession.query(Resource).get(parent_resource_id)
    children = parent_resource.children
    dbsession.close()

    suitable_types = [
        ResourceGroup.identity,
        FoclProject.identity,
        ]
    if type_filter == 'vols' or not type_filter:
        suitable_types.append(FoclStruct.identity)
    if type_filter == 'sit' or not type_filter:
        suitable_types.append(SituationPlan.identity)


    child_resources_json = []
    for child_resource in children:
        if child_resource.identity in suitable_types:
            is_need_checkbox = child_resource.identity in (FoclProject.identity, SituationPlan.identity, FoclStruct.identity)
            has_children = child_resource.identity in (ResourceGroup.identity, FoclProject.identity) # TODO: add check for real children
            child_resources_json.append({
                'id': 'res_' + str(child_resource.id),
                'text': child_resource.display_name,
                'children': has_children,
                'has_children': has_children,
                'icon': child_resource.identity,
                'res_type': child_resource.identity,
                'a_attr': {'chb': is_need_checkbox}
            })

            if not is_need_checkbox:
                child_resources_json[-1]['state'] = {'disabled': True}
    return Response(json.dumps(child_resources_json))


def show_map(request):
    focl_layers_type = get_focl_layers_list()
    sit_plan_layers_type = get_sit_plan_layers_list()
    values = dict(custom_layout=True, focl_layers_type=focl_layers_type, sit_plan_layers_type=sit_plan_layers_type)
    return render_to_response('nextgisweb_compulink:compulink_site/templates/monitoring_webmap/display.mako', values, request=request)


def get_focl_layers_list():
    layers_template_path = path.join(ADMIN_BASE_PATH, 'layers_templates/')

    layers_for_jstree = []

    for vl_name in FOCL_LAYER_STRUCT:
            with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                layers_for_jstree.append({
                    'text': json_layer_struct['resource']['display_name'],
                    'id': vl_name,
                    'children': False
                    })

    layers_for_jstree.reverse()
    return layers_for_jstree


def get_sit_plan_layers_list():
    layers_template_path = path.join(ADMIN_BASE_PATH, 'situation_layers_templates/')

    layers = []

    for vl_name in SIT_PLAN_LAYER_STRUCT:
            with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                layers.append({
                    'text': json_layer_struct['resource']['display_name'],
                    'id': vl_name,
                    'children': False
                })
    layers.reverse()
    return layers

@view_config(renderer='json')
def get_focl_info(request):
    res_ids = request.POST.getall('ids')
    if not res_ids:
        return Response('[]')

    dbsession = DBSession()
    resources = dbsession.query(Resource).options(joinedload_all('parent.parent')).filter(Resource.id.in_(res_ids)).all()
    #TODO: remove joinedload_all after real props was added

    resp = []
    for res in resources:
        par = res.parent
        gr_par = par.parent
        resp.append({'id': res.id, 'display_name': res.display_name, 'district': par.display_name, 'region': gr_par.display_name})

    dbsession.close()

    return Response(json.dumps(resp))


def extent_union(extent, new_extent):
    return [
        extent[0] if extent[0] < new_extent[0] else new_extent[0],
        extent[1] if extent[1] < new_extent[1] else new_extent[1],
        extent[2] if extent[2] > new_extent[2] else new_extent[2],
        extent[3] if extent[3] > new_extent[3] else new_extent[3],
    ]

def extent_buff(extent, buff_size):
    return [
        extent[0] - buff_size,
        extent[1] - buff_size,
        extent[2] + buff_size,
        extent[3] + buff_size,
    ]


@view_config(renderer='json')
def get_focl_extent(request):

    if 'id' in request.params:
        res_id = request.params['id']
    else:
        return Response('[]')

    dbsession = DBSession()
    resource = dbsession.query(Resource).filter(Resource.id==res_id).first()

    extent = None
    for res in resource.children:
        if res.identity != VectorLayer.identity:
            continue
        #get extent
        tableinfo = TableInfo.from_layer(res)
        tableinfo.setup_metadata(tablename=res._tablename)

        columns = [db.func.st_astext(db.func.st_envelope(db.text('geom')).label('box'))]
        query = sql.select(columns=columns, from_obj=tableinfo.table)
        extent_str = dbsession.connection().scalar(query)
        if extent_str:
            if not extent:
                extent = loads(extent_str).bounds
            else:
                new_extent = loads(extent_str).bounds
                extent = extent_union(extent, new_extent)

    dbsession.close()
    extent = extent_buff(extent, 3000)
    resp = {'extent': extent}
    return Response(json.dumps(resp))



@view_config(renderer='json')
def get_layers_by_type(request):
    # TODO: optimize this!!!
    group_res_ids = request.POST.getall('resources')
    layer_types = request.POST.getall('types')

    if not group_res_ids or not layer_types:
        return Response("[]")

    resp_list = []

    dbsession = DBSession()
    #все ВОСЛ и СИТ планы для присланных ид
    group_resources = dbsession.query(Resource).options(joinedload_all('children.children')).filter(Resource.id.in_(group_res_ids)).all()

    for group_res in group_resources:
        for child_res in group_res.children:
            # Если не векторный слой или не имеет кейнейма - не подходит
            if child_res.identity != VectorLayer.identity or not child_res.keyname:
                continue
            lyr_type = _get_layer_type_by_name(layer_types, child_res.keyname)
            # Тип векторного слоя не подходит по присланному набору
            if not lyr_type:
                continue
            style_resorces = child_res.children
            # Если нет стилей - не подходит
            if not style_resorces:
                continue
            resp_list.append({
                'vector_id': child_res.id,
                'style_id': style_resorces[0].id,
                'res_id': group_res.id,
                'type': lyr_type,
                'res_type': group_res.identity
            })

    dbsession.close()
    return Response(json.dumps(resp_list))


def _get_layer_type_by_name(layers_types, name):
    for layer_type in layers_types:
        if name.startswith(layer_type):
            return layer_type
    return None