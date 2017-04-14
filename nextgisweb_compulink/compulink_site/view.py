# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import os
from os import path, mkdir
from shutil import rmtree
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED
import codecs
import geojson
from osgeo import ogr
from shapely.geometry import shape, mapping
from shapely.wkt import loads
from pyramid.httpexceptions import HTTPForbidden, HTTPNotFound, HTTPBadRequest
from pyramid.renderers import render_to_response
from pyramid.response import Response, FileResponse
from pyramid.view import view_config
from sqlalchemy.orm import joinedload_all
import sqlalchemy.sql as sql
import subprocess
from nextgisweb import DBSession, db
from nextgisweb.feature_layer.view import PD_READ, ComplexEncoder
from nextgisweb.resource import Resource, ResourceGroup, DataScope
from nextgisweb.resource.model import ResourceACLRule
from nextgisweb.vector_layer import VectorLayer, TableInfo
from nextgisweb_compulink.compulink_reporting.utils import OverdueStatusCalculator
from ..compulink_admin.layers_struct_group import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT, FOCL_REAL_LAYER_STRUCT,\
    OBJECTS_LAYER_STRUCT, ACTUAL_FOCL_REAL_LAYER_STRUCT
from ..compulink_admin.model import SituationPlan, FoclStruct, FoclProject, PROJECT_STATUS_DELIVERED, \
    PROJECT_STATUS_BUILT, FoclStructScope, Region, District, ConstructObject
from ..compulink_admin.well_known_resource import DICTIONARY_GROUP_KEYNAME
from .. import compulink_admin
from ..compulink_admin.view import get_region_name, get_district_name, get_regions_from_resource, \
    get_districts_from_resource, get_project_statuses
from nextgisweb_compulink.compulink_reporting.model import ConstructionStatusReport
from nextgisweb_compulink.compulink_site import COMP_ID
from nextgisweb_log.model import LogEntry, LogLevels
from nextgisweb_lookuptable.model import LookupTable
from nextgisweb_compulink.compulink_admin.reference_books.views.ReferenceBookViewBase import ReferenceBookViewBase
from nextgisweb_compulink.compulink_admin.reference_books.dgrid_viewmodels import construct_objects_dgrid_viewmodel

CURR_PATH = path.dirname(__file__)
ADMIN_BASE_PATH = path.dirname(path.abspath(compulink_admin.__file__))


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.site.map',
        '/compulink/monitoring_map',
        client=()).add_view(show_map)

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
        'compulink.site.get_object_extent',
        '/compulink/resources/object_extent').add_view(get_object_extent)

    config.add_route(
        'compulink.site.layers_by_type',
        '/compulink/resources/layers_by_type').add_view(get_layers_by_type)

    config.add_route(
        'compulink.site.regions_tree',
        '/compulink/regions/tree').add_view(get_regions_tree)

    config.add_static_view(
        name='compulink/static',
        path='nextgisweb_compulink:compulink_site/static', cache_max_age=3600)

    config.add_route(
        'compulink.site.export_kml',
        '/compulink/resources/{id:\d+}/export_kml', client=('id',)) \
        .add_view(export_focl_to_kml)

    config.add_route(
        'compulink.site.export_geojson',
        '/compulink/resources/{id:\d+}/export_geojson', client=('id',)) \
        .add_view(export_focl_to_geojson)
    config.add_route(
        'compulink.site.export_csv',
        '/compulink/resources/{id:\d+}/export_csv', client=('id',)) \
        .add_view(export_focl_to_csv)
    config.add_route(
        'compulink.site.get_focl_status',
        '/compulink/resources/{id:\d+}/focl_status', client=('id',)) \
        .add_view(get_focl_status)
    config.add_route(
        'compulink.site.set_focl_status',
        '/compulink/resources/{id:\d+}/set_focl_status', client=('id',)) \
        .add_view(set_focl_status)
    config.add_route(
        'compulink.site.get_dicts',
        '/compulink/get_dicts',) \
        .add_view(get_dicts)
    config.add_route(
        'compulink.site.get_focl_parents',
        '/compulink/resources/{id:\d+}/get_focl_parents', client=('id',)) \
        .add_view(get_focl_parents)


@view_config(renderer='json')
def get_child_resx_by_parent(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    parent_resource_id = request.params.get('id', None)
    if parent_resource_id is None:
        raise HTTPBadRequest('Set "id" param!')
    else:
        parent_resource_id = parent_resource_id.replace('res_', '')
    is_root_node_requsted = parent_resource_id == '#'

    type_filter = request.params.get('type', None)

    dbsession = DBSession()
    if is_root_node_requsted:
        parent_resource_id = dbsession.query(Resource).filter(Resource.parent==None).all()[0].id

    parent_resource = dbsession.query(Resource).get(parent_resource_id)
    children = parent_resource.children

    suitable_types = [
        ResourceGroup.identity,
        FoclProject.identity,
        ]
    if type_filter == 'vols' or not type_filter:
        suitable_types.append(FoclStruct.identity)
    if type_filter == 'sit' or not type_filter:
        suitable_types.append(SituationPlan.identity)

    if not request.user.is_administrator:
        allowed_res_list = _get_user_resources_tree(request.user)

    allowed_res_list = _get_user_resources_tree(request.user)

    child_resources_json = []
    for child_resource in children:
        if child_resource.identity in suitable_types:
            # remove system folders
            if child_resource.identity == ResourceGroup.identity and child_resource.keyname == DICTIONARY_GROUP_KEYNAME:
                continue
            # check permissions
            if not request.user.is_administrator and child_resource.id not in allowed_res_list:
                continue
            is_need_checkbox = child_resource.identity in (FoclProject.identity, SituationPlan.identity, FoclStruct.identity)
            has_children = child_resource.identity in (ResourceGroup.identity, FoclProject.identity)
            child_resources_json.append({
                'id': 'res_' + str(child_resource.id),
                'text': child_resource.display_name,
                'children': has_children,
                'has_children': has_children,
                'icon': child_resource.identity,
                'res_type': child_resource.identity,
                'a_attr': {'chb': is_need_checkbox}
            })

            # if not is_need_checkbox:
            #     child_resources_json[-1]['state'] = {'disabled': True}

    dbsession.close()

    return Response(json.dumps(child_resources_json))


def _get_user_resources_tree(user):

    principal_ids = [user.principal_id,]
    for group in user.member_of:
        principal_ids.append(group.principal_id)

    # get explicit rules
    rules_query = DBSession.query(ResourceACLRule)\
        .filter(ResourceACLRule.principal_id.in_(principal_ids))\
        .filter(ResourceACLRule.scope == DataScope.identity)\
        .options(joinedload_all(ResourceACLRule.resource))

    allowed_res_ids = set()

    def get_child_perms_recursive(resource):
        # add self
        if resource.identity == FoclStruct.identity:
            if resource.has_permission(DataScope.write, user) or resource.has_permission(DataScope.read, user):
                allowed_res_ids.add(resource.id)
        elif resource.identity in [ResourceGroup.identity, FoclProject.identity]:
            allowed_res_ids.add(resource.id)
        # add childs
        if resource.identity in [ResourceGroup.identity, FoclProject.identity]:
            for child in resource.children:
                get_child_perms_recursive(child)

    def get_parents_recursive(resource):
        if resource.parent is not None:
            allowed_res_ids.add(resource.parent.id)
            get_parents_recursive(resource.parent)

    for rule in rules_query.all():
        get_child_perms_recursive(rule.resource)
        get_parents_recursive(rule.resource)

    return allowed_res_ids


def show_map(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    focl_layers = get_focl_layers_list()
    sit_plan_layers_type = get_sit_plan_layers_list()
    values = dict(
        show_header=True,
        construct_objects_attr_settings=ReferenceBookViewBase\
            ._get_json_column_settings(construct_objects_dgrid_viewmodel),
        focl_layers_type=focl_layers['focl'],
        objects_layers_type=focl_layers['objects'],
        real_layers_type=focl_layers['real'],
        sit_plan_layers_type=sit_plan_layers_type
    )
    return render_to_response('nextgisweb_compulink:compulink_site/templates/monitoring_webmap/display.mako', values,
                              request=request)


def get_focl_layers_list():
    layer_order = len(FOCL_LAYER_STRUCT) + len(OBJECTS_LAYER_STRUCT) + len(ACTUAL_FOCL_REAL_LAYER_STRUCT) +\
                  len(SIT_PLAN_LAYER_STRUCT)

    focl_layers_for_jstree = []
    layers_template_path = path.join(ADMIN_BASE_PATH, 'layers_templates/')
    for vl_name in reversed(FOCL_LAYER_STRUCT):
        with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
            json_layer_struct = json.load(json_file, encoding='utf-8')
            focl_layers_for_jstree.append({
                'text': json_layer_struct['resource']['display_name'],
                'identify_text': json_layer_struct['resource']['identify_name'],
                'id': vl_name,
                'children': False,
                'icon': vl_name,
                'order': layer_order
                })
        layer_order -= 1

    objects_layers_for_jstree = []
    layers_template_path = path.join(ADMIN_BASE_PATH, 'layers_templates/')
    for vl_name in reversed(OBJECTS_LAYER_STRUCT):
        with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
            json_layer_struct = json.load(json_file, encoding='utf-8')
            objects_layers_for_jstree.append({
                'text': json_layer_struct['resource']['display_name'],
                'identify_text': json_layer_struct['resource']['identify_name'],
                'id': vl_name,
                'children': False,
                'icon': vl_name,
                'order': layer_order
                })
        layer_order -= 1

    real_layers_for_jstree = []
    layers_template_path = path.join(ADMIN_BASE_PATH, 'actual_real_layers_templates/')
    for vl_name in reversed(ACTUAL_FOCL_REAL_LAYER_STRUCT):
        with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
            json_layer_struct = json.load(json_file, encoding='utf-8')
            real_layers_for_jstree.append({
                'text': json_layer_struct['resource']['display_name'],
                'identify_text': json_layer_struct['resource']['identify_name'],
                'id': vl_name,
                'children': False,
                'icon': vl_name,
                'order': layer_order
                })
        layer_order -= 1

    return {
        'focl': focl_layers_for_jstree,
        'objects': objects_layers_for_jstree,
        'real': real_layers_for_jstree
    }


def get_sit_plan_layers_list():
    layers_template_path = path.join(ADMIN_BASE_PATH, 'situation_layers_templates/')

    layers = []
    layer_order = len(SIT_PLAN_LAYER_STRUCT)

    for vl_name in reversed(SIT_PLAN_LAYER_STRUCT):
        with codecs.open(path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
            json_layer_struct = json.load(json_file, encoding='utf-8')
            layers.append({
                'text': json_layer_struct['resource']['display_name'],
                'identify_text': json_layer_struct['resource']['identify_name'],
                'id': vl_name,
                'children': [],
                'icon': vl_name,
                'order': layer_order
            })
        layer_order -= 1
    return layers


@view_config(renderer='json')
def get_focl_info(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    res_ids = request.POST.getall('ids')
    if not res_ids:
        return Response('[]')

    now_dt = date.today()

    dbsession = DBSession()
    resources = dbsession.query(Resource).filter(Resource.id.in_(res_ids)).all()

    # get rows from registry
    focl_info_rows = {
        row.resource_id: row for row in dbsession.query(ConstructObject).filter(ConstructObject.resource_id.in_(res_ids)).all()
    }

    # get rows from reporting
    reporting_rows = {
        row.focl_res_id: row for row in dbsession.query(ConstructionStatusReport).filter(ConstructionStatusReport.focl_res_id.in_(res_ids)).all()
    }

    resp = []

    #dicts
    regions = get_regions_from_resource(as_dict=True)
    districts = get_districts_from_resource(as_dict=True)
    statuses = get_project_statuses(as_dict=True)

    for res in resources:
        if res.identity not in (FoclStruct.identity, SituationPlan.identity):
            continue

        # try to get data from status report
        if res.id in reporting_rows.keys() and res.id in focl_info_rows.keys():
            report_row = reporting_rows[res.id]
            focl_info = focl_info_rows[res.id]
            resp.append(
                {
                    'id': res.id,
                    'display_name': focl_info.name,
                    'district': districts.get(focl_info.district_id, focl_info.district_id),
                    'region': regions.get(focl_info.region_id, focl_info.region_id),
                    'status': statuses.get(res.status, res.status),

                    'cabling_plan': focl_info.cabling_plan,
                    'cabling_fact': report_row.cabling_fact,
                    'cabling_percent': report_row.cabling_percent,

                    'start_build_time': focl_info.start_build_date.strftime('%d.%m.%Y') if focl_info.start_build_date else '',
                    'end_build_time': focl_info.end_build_date.strftime('%d.%m.%Y') if focl_info.end_build_date else '',
                    'start_deliver_time': focl_info.start_deliver_date.strftime('%d.%m.%Y') if focl_info.start_deliver_date else '',
                    'end_deliver_time': focl_info.end_deliver_date.strftime('%d.%m.%Y') if focl_info.end_deliver_date else '',

                    'subcontr': focl_info.subcontr_name,

                    'is_overdue': OverdueStatusCalculator.overdue_status(focl_info.end_build_date, res.status),
                    'is_month_overdue': OverdueStatusCalculator.month_overdue_status(focl_info.end_build_date, res.status),
                    'is_focl_delivered': res.status == PROJECT_STATUS_DELIVERED,

                    'cabling_plan_today': (focl_info.cabling_plan * (float((now_dt - focl_info.start_build_date).days)/((focl_info.end_build_date - focl_info.start_build_date).days)))
                        if (focl_info.end_build_date and focl_info.start_build_date and focl_info.cabling_plan and (focl_info.end_build_date - focl_info.start_build_date).days !=0) else None,
                    'status_row': res.status,
                    'editable': request.user.is_administrator or res.has_permission(FoclStructScope.edit_prop, request.user)
                }
            )
        # else get from registry
        elif res.id in focl_info_rows.keys():
            focl_info = focl_info_rows[res.id]
            resp.append(
                {
                    'id': res.id,
                    'display_name': focl_info.name,
                    'district': districts.get(focl_info.district_id, focl_info.district_id),
                    'region': regions.get(focl_info.region_id, focl_info.region_id),
                    'status': statuses.get(res.status, res.status),

                    'cabling_plan': focl_info.cabling_plan,
                    'cabling_fact': None,
                    'cabling_percent': None,

                    'start_build_time': focl_info.start_build_date.strftime('%d.%m.%Y') if focl_info.start_build_date else '',
                    'end_build_time': focl_info.end_build_date.strftime('%d.%m.%Y') if focl_info.end_build_date else '',
                    'start_deliver_time': focl_info.start_deliver_date.strftime('%d.%m.%Y') if focl_info.start_deliver_date else '',
                    'end_deliver_time': focl_info.end_deliver_date.strftime('%d.%m.%Y') if focl_info.end_deliver_date else '',

                    'subcontr': focl_info.subcontr_name,

                    'is_overdue': OverdueStatusCalculator.overdue_status(focl_info.end_build_date, res.status),
                    'is_month_overdue': OverdueStatusCalculator.month_overdue_status(focl_info.end_build_date, res.status),
                    'is_focl_delivered': res.status == PROJECT_STATUS_DELIVERED,

                    'cabling_plan_today': (focl_info.cabling_plan * (float((now_dt - focl_info.start_build_date).days)/((focl_info.end_build_date - focl_info.start_build_date).days)))
                        if (focl_info.end_build_date and focl_info.start_build_date and focl_info.cabling_plan and (focl_info.end_build_date - focl_info.start_build_date).days !=0) else None,
                    'status_row': res.status,
                    'editable': request.user.is_administrator or res.has_permission(FoclStructScope.edit_prop, request.user)
                }
            )
        else:
            # else get from resource
            resp.append(
                {
                    'id': res.id,
                    'display_name': res.display_name,
                    'district': districts.get(res.district, res.district),
                    'region': regions.get(res.region, res.region),
                    'status': statuses.get(res.status, res.status),

                    'cabling_plan': None,
                    'cabling_fact': None,
                    'cabling_percent': None,

                    'start_build_time': None,
                    'end_build_time': None,
                    'start_deliver_time': None,
                    'end_deliver_time': None,

                    'subcontr': None,

                    'is_overdue': False,
                    'is_month_overdue': False,
                    'is_focl_delivered': res.status == PROJECT_STATUS_DELIVERED,

                    'cabling_plan_today': None,
                    'status_row': res.status,
                    'editable': request.user.is_administrator or res.has_permission(FoclStructScope.edit_prop, request.user)
                }
            )

    dbsession.close()

    return Response(json.dumps(resp))


@view_config(renderer='json')
def get_focl_parents(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    res_id = request.matchdict['id']
    response = []

    try:
        dbsession = DBSession()
        focl_resource = dbsession.query(FoclStruct).get(res_id)
    except:
        raise HTTPNotFound()

    if not focl_resource:
        raise HTTPNotFound()

    while focl_resource:
        response.append(focl_resource.id)
        focl_resource = focl_resource.parent

    response.reverse()

    return Response(json.dumps(response[:-1]))


def extent_union(extent, new_extent):
    return [
        extent[0] if extent[0] < new_extent[0] else new_extent[0],
        extent[1] if extent[1] < new_extent[1] else new_extent[1],
        extent[2] if extent[2] > new_extent[2] else new_extent[2],
        extent[3] if extent[3] > new_extent[3] else new_extent[3],
    ]


def extent_buff(extent, buff_size):
    if extent:
        return [
            extent[0] - buff_size,
            extent[1] - buff_size,
            extent[2] + buff_size,
            extent[3] + buff_size,
        ]
    return None


@view_config(renderer='json')
def get_focl_extent(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    res_id = request.params.get('id', None)
    if res_id is None:
        return Response('[]')

    resp = {'extent': get_extent_by_resource_id(res_id)}
    return Response(json.dumps(resp))


def get_extent_by_resource_id(resource_id):
    session = DBSession()
    resource = session.query(Resource).filter(Resource.id == resource_id).first()

    extent = None
    for res in resource.children:
        if res.identity != VectorLayer.identity or (res.keyname and res.keyname.startswith('real_')):
            continue

        table_info = TableInfo.from_layer(res)
        table_info.setup_metadata(tablename=res._tablename)

        columns = [db.func.st_astext(db.func.st_extent(db.text('geom')).label('box'))]
        query = sql.select(columns=columns, from_obj=table_info.table)
        extent_str = session.connection().scalar(query)

        if extent_str:
            if not extent:
                extent = loads(extent_str).bounds
            else:
                new_extent = loads(extent_str).bounds
                extent = extent_union(extent, new_extent)

    session.close()

    return extent_buff(extent, 2000)


@view_config(renderer='json')
def get_object_extent(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    resource_id = request.params.get('resource_id', None)
    object_type = request.params.get('object_type', None)
    object_num = request.params.get('object_num', None)

    if resource_id is None:
        return Response('[]')

    if None in (object_num, object_type):
        resp = {'extent': get_extent_by_resource_id(resource_id)}
        return Response(json.dumps(resp))

    extent = get_extent_by_objext_num(resource_id, object_type, object_num)
    if not extent:
        extent = get_extent_by_resource_id(resource_id)

    resp = {'extent': extent}
    return Response(json.dumps(resp))


def get_extent_by_objext_num(resource_id, object_type, object_num):
    extent = []

    session = DBSession()
    resource = session.query(Resource).filter(Resource.id == resource_id).first()

    if not resource:
        return extent

    layer_type = 'actual_real_' + object_type
    layer = None
    for res in resource.children:
        if get_layer_type(res) == layer_type:
            layer = res
            break

    if not layer:
        return extent

    query = layer.feature_query()
    query.box()

    query.filter_by(id=object_num)
    query.limit(1)

    obj = None
    for f in query():
        obj = f

    if not obj:
        return extent

    return obj.box.bounds


def get_layer_type(layer):
    if layer.keyname and '_' in layer.keyname:
        return '_'.join(layer.keyname.rsplit('_')[:-1])
    else:
        return None



@view_config(renderer='json')
def get_layers_by_type(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    # TODO: optimize this!!!
    group_res_ids = request.POST.getall('resources')
    layer_types = request.POST.getall('types')

    if not group_res_ids or not layer_types:
        return Response("[]")

    layer_types.sort(reverse=True)
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
            if '_point' in layer_type and '_point' not in name:
                continue
            if '_point' not in layer_type and '_point' in name:
                continue
            return layer_type
    return None


def get_all_dicts():
    dbsession = DBSession()
    dicts_resources = dbsession.query(LookupTable).all()

    dicts = {}
    for dict_res in dicts_resources:
        dicts[dict_res.keyname] = dict_res.val

    dbsession.close()

    return dicts


@view_config(renderer='json')
def get_dicts(request):
    return Response(json.dumps(get_all_dicts()))


def export_focl_to_kml(request):
    return export_focl_struct(request, 'kml')


def export_focl_to_geojson(request):
    return export_focl_struct(request, 'geojson')


def export_focl_to_csv(request):
    return export_focl_struct(request, 'csv')


def export_focl_struct(request, export_type):
    res_id = request.matchdict['id']
    dbsession = DBSession()

    try:
        focl_resource = dbsession.query(FoclStruct).get(res_id)
    except:
        raise HTTPNotFound()

    if not focl_resource.has_permission(DataScope.read, request.user):
        raise HTTPForbidden()

    LogEntry.info('Export resource %s to %s' % (res_id, export_type), component=COMP_ID)

    #create temporary dir
    zip_dir = tempfile.mkdtemp()

    # save layers to geojson (FROM FEATURE_LAYER)
    for layer in focl_resource.children:
        if layer.identity == VectorLayer.identity and layer.feature_query()().total_count > 0:
            json_path = path.join(zip_dir, '%s.%s' % (layer.display_name, 'json'))
            _save_resource_to_file(layer, json_path, single_geom=export_type == 'csv')
            if export_type == 'kml':
                kml_path = path.join(zip_dir, '%s.%s' % (layer.display_name, 'kml'))
                _json_to_kml(json_path, kml_path)
                # remove json
                os.remove(json_path.encode('utf-8'))
            if export_type == 'csv':
                csv_path = path.join(zip_dir, '%s.%s' % (layer.display_name, 'csv'))
                _json_to_csv(json_path, csv_path)
                # remove json
                os.remove(json_path.encode('utf-8'))

    with tempfile.NamedTemporaryFile(delete=True) as temp_file:
        # write archive
        zip_file = ZipFile(temp_file, mode="w", compression=ZIP_DEFLATED)
        zip_subpath = focl_resource.display_name + '/'

        for file_name in os.listdir(zip_dir):
            src_file = path.join(zip_dir, file_name)
            zip_file.write(src_file, (zip_subpath+unicode(file_name, 'utf-8')).encode('cp866'))
        zip_file.close()

        # remove temporary dir
        rmtree(zip_dir)

        # send
        temp_file.seek(0, 0)
        response = FileResponse(
            path.abspath(temp_file.name),
            content_type=bytes('application/zip'),
            request=request
        )
        disp_name = focl_resource.display_name
        for ch in '\\/:*?"<>|':
            disp_name = disp_name.replace(ch, '')
        response.content_disposition = (u'attachment; filename="%s [%s].zip"' % (disp_name, export_type)).encode('utf-8')
        return response


def _save_resource_to_file(vector_resource, file_path, single_geom=False):
    #resource_permission(PD_READ)

    class CRSProxy(object):
        def __init__(self, query):
            self.query = query

        @property
        def __geo_interface__(self):
            result = self.query.__geo_interface__
            result['crs'] = dict(type='name', properties=dict(
                name='EPSG:3857'))
            return result

    query = vector_resource.feature_query()
    query.geom(single_part=single_geom)
    result = CRSProxy(query())

    gj = geojson.dumps(result, ensure_ascii=False, cls=ComplexEncoder)
    with codecs.open(file_path.encode('utf-8'), 'w', encoding='utf-8') as f:
        f.write(gj)


def _json_to_kml(in_file_path, out_file_path):
    subprocess.check_call(['ogr2ogr', '-f', 'KML', out_file_path.encode('utf-8'), in_file_path.encode('utf-8')])


def _json_to_csv(in_file_path, out_file_path):
    subprocess.check_call(['ogr2ogr',
                           '-f', 'CSV',
                           out_file_path.encode('utf-8'),
                           in_file_path.encode('utf-8'),
                           '-lco', 'GEOMETRY=AS_XY',
                           '-s_srs', 'EPSG:3857',
                           '-t_srs', 'EPSG:4326'])


@view_config(renderer='json')
def get_focl_status(request):
    res_id = request.matchdict['id']
    dbsession = DBSession()

    try:
        focl_resource = dbsession.query(FoclStruct).get(res_id)
    except:
        raise HTTPNotFound()

    if not focl_resource:
        raise HTTPNotFound()

    if not (focl_resource.has_permission(DataScope.write, request.user) or focl_resource.has_permission(DataScope.read, request.user)):
        raise HTTPForbidden()

    resp = {
        'statuses': get_project_statuses(),
        'focl_status': focl_resource.status
    }

    return Response(json.dumps(resp))


@view_config(renderer='json')
def set_focl_status(request):
    res_id = request.matchdict['id']
    dbsession = DBSession()

    new_status = request.params.get('status', None)
    if new_status is None or new_status not in get_project_statuses(as_dict=True).keys():
        raise HTTPBadRequest('Set right status!')

    # update resource
    try:
        focl_resource = dbsession.query(FoclStruct).get(res_id)
    except:
        raise HTTPNotFound()

    if not focl_resource:
        raise HTTPNotFound()

    if not focl_resource.has_permission(DataScope.write, request.user):
        raise HTTPForbidden()

    focl_resource.status = new_status
    focl_resource.persist()

    # update reports
    try:
        report_line = dbsession.query(ConstructionStatusReport).filter(ConstructionStatusReport.focl_res_id == res_id).one()
    except:
        report_line = None

    if report_line:
        now_dt = date.today()
        report_line.status = new_status
        if report_line.end_build_time and \
           now_dt > report_line.end_build_time.date() and \
           report_line.status not in [PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED]:
            report_line.is_overdue = True
            report_line.is_month_overdue = now_dt - relativedelta(months=1) > report_line.end_build_time.date()
        else:
            report_line.is_overdue = False
            report_line.is_month_overdue = False

        report_line.persist()

    return Response(json.dumps({'status': 'ok'}))


@view_config(renderer='json')
def get_regions_tree(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    parent_region_id = request.params.get('id', None)
    if parent_region_id is None:
        raise HTTPBadRequest('Set "id" param!')
    else:
        parent_region_id = parent_region_id.replace('reg_', '')
    is_root_node_requsted = parent_region_id == '#'

    dbsession = DBSession()
    is_region = False
    if is_root_node_requsted:
        is_region = True
        children = dbsession.query(Region).order_by(Region.name).all()
    else:
        children = dbsession.query(District)\
            .filter(District.region_id == parent_region_id)\
            .order_by(District.name)\
            .all()

    child_json = []
    for child in children:
        has_children = type(child) is Region
        is_need_checkbox = False
        child_json.append({
            'id': ('reg_' if is_region else 'distr_') + str(child.id),
            'text': child.name,
            'children': has_children,
            'has_children': has_children,
            # 'icon': child_resource.identity,
            # 'res_type': child_resource.identity,
            'a_attr': {'chb': is_need_checkbox}
        })

    dbsession.close()

    return Response(json.dumps(child_json))
