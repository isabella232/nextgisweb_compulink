# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function

import json
import uuid
from datetime import date, datetime

import codecs
import sqlalchemy.sql as sql
import transaction
from dateutil.relativedelta import relativedelta
from os import path
from pyproj import Proj, transform
from pyramid.httpexceptions import HTTPForbidden, HTTPNotFound, HTTPBadRequest
from pyramid.renderers import render_to_response
from pyramid.response import Response
from pyramid.view import view_config
from shapely.wkt import loads
from sqlalchemy.orm import joinedload_all
from shapely.geometry import MultiLineString, Polygon, Point, LineString

from config.editor import get_editable_layers_styles
from config.player import get_playable_layers_styles
from nextgisweb import DBSession, db
from nextgisweb.feature_layer import IWritableFeatureLayer
from nextgisweb.resource import Resource, ResourceGroup, DataScope
from nextgisweb.resource.model import ResourceACLRule
from nextgisweb.vector_layer import VectorLayer, TableInfo
from nextgisweb.feature_layer import Feature
from nextgisweb_compulink.compulink_data_reactor.reactors.construct_focl_line.construct_focl_line_reactor import \
    ConstructFoclLineReactor
from nextgisweb_compulink.compulink_data_reactor.reactors.construct_spec_transition_line.construct_spec_transition_line_reactor import \
    ConstructSpecTransitionLineReactor
from nextgisweb_compulink.compulink_reporting.model import ConstructionStatusReport
from nextgisweb_compulink.compulink_site.view import get_extent_by_resource_id
from nextgisweb_compulink.utils import error_response, success_response
from nextgisweb_lookuptable.model import LookupTable
from .. import compulink_admin
from nextgisweb_compulink.compulink_admin.layers_struct_group import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT, FOCL_REAL_LAYER_STRUCT,\
    OBJECTS_LAYER_STRUCT
from ..compulink_admin.model import SituationPlan, FoclStruct, FoclProject, PROJECT_STATUS_DELIVERED, \
    PROJECT_STATUS_BUILT, FoclStructScope
from ..compulink_admin.view import get_project_statuses
from ..compulink_admin.well_known_resource import DICTIONARY_GROUP_KEYNAME

CURR_PATH = path.dirname(__file__)
ADMIN_BASE_PATH = path.dirname(path.abspath(compulink_admin.__file__))
GUID_LENGTH = 32



def setup_pyramid(comp, config):
    # todo: check URL's
    config.add_route(
        'compulink.editor.map',
        '/compulink/editor',
        client=()).add_view(show_map)

    config.add_route(
        'compulink.editor.json',
        '/compulink/editor/resources/child').add_view(get_child_resx_by_parent)

    config.add_route(
        'compulink.editor.focl_extent',
        '/compulink/editor/resources/focl_extent').add_view(get_focl_extent)

    config.add_route(
        'compulink.editor.layers_by_type',
        '/compulink/editor/resources/layers_by_type').add_view(get_layers_by_type)

    config.add_static_view(
        name='compulink/editor/static',
        path='nextgisweb_compulink:compulink_editor/static', cache_max_age=3600)

    config.add_route(
        'compulink.editor.get_focl_status',
        '/compulink/editor/resources/{id:\d+}/focl_status', client=('id',)) \
        .add_view(get_focl_status)

    config.add_route(
        'compulink.editor.set_focl_status',
        '/compulink/editor/resources/{id:\d+}/set_focl_status', client=('id',)) \
        .add_view(set_focl_status)

    config.add_route(
        'compulink.editor.save_geom',
        '/compulink/editor/features/save') \
        .add_view(editor_save_geom)

    config.add_route(
        'compulink.editor.create_geom',
        '/compulink/editor/lines/create') \
        .add_view(editor_create_geom)

    config.add_route(
        'compulink.editor.remove_geom',
        '/compulink/editor/features/remove') \
        .add_view(editor_delete_geom)

    config.add_route(
        'compulink.editor.construct_line',
        '/compulink/editor/construct_line/{id:\d+}', client=('id',)) \
        .add_view(construct_line)

    config.add_route(
        'compulink.editor.reset_point',
        '/compulink/editor/reset_point') \
        .add_view(reset_point)

    config.add_route(
        'compulink.editor.reset_layer',
        '/compulink/editor/reset_layer/{id:\d+}', client=('id',)) \
        .add_view(reset_all_layer)

    config.add_route(
        'compulink.player.map',
        '/compulink/player',
        client=()).add_view(show_map_player)

    config.add_route(
        'compulink.player.recording_video',
        '/compulink/player/recording_video',
        client=()).add_view(show_player_for_recording_video)

    config.add_route(
        'compulink.editor.not-editable-features',
        '/compulink/editor/features/not-editable/{id:\d+}', client=('id',)) \
        .add_view(get_not_editable_features)


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
        parent_resource_id = dbsession.query(Resource).filter(Resource.parent == None).all()[0].id

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
    else:
        allowed_res_list = []

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

            if not is_need_checkbox:
                child_resources_json[-1]['state'] = {'disabled': True}

    dbsession.close()

    return Response(json.dumps(child_resources_json))


def _get_user_resources_tree(user):
    # get explicit rules
    rules_query = DBSession.query(ResourceACLRule)\
        .filter(ResourceACLRule.principal_id == user.principal_id)\
        .filter(ResourceACLRule.scope == DataScope.identity)\
        .options(joinedload_all(ResourceACLRule.resource))

    # todo: user groups explicit rules???
    allowed_res_ids = set()

    def get_child_perms_recursive(resource):
        # add self
        if resource.identity == FoclStruct.identity:
            if resource.has_permission(DataScope.write, user):
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
    values = _get_values_for_display(request)
    return render_to_response('nextgisweb_compulink:compulink_editor/templates/monitoring_webmap/display.mako',
                              values,
                              request=request)


def show_map_player(request):
    values = _get_values_for_display(request)
    values['player_sound_file'] = request.route_url('compulink_video_admin.audio_file') + '?hash=' + str(uuid.uuid4())
    values['is_recording'] = False

    return render_to_response('nextgisweb_compulink:compulink_editor/templates/player/display.mako',
                              values,
                              request=request)


def show_player_for_recording_video(request):
    values = _get_values_for_display(request)

    values['player_sound_file'] = request.route_url('compulink_video_admin.audio_file') + '?hash=' + str(uuid.uuid4())
    values['is_recording'] = True

    values['player_parameters'] = {
        'count_units': request.GET.get('count_units'),
        'units': request.GET.get('units'),
        'photo': request.GET.get('photo'),
        'zoom': request.GET.get('zoom'),
        'lat_center': request.GET.get('lat_center'),
        'lon_center': request.GET.get('lon_center'),
        'DELAY_AFTER_LOADED': 3000,
        'DELAY_AFTER_PLAY_FINISHED': 3000
    }

    return render_to_response('nextgisweb_compulink:compulink_editor/templates/player/display.mako',
                              values,
                              request=request)


def _get_values_for_display(request):
    resource_id = int(request.GET['resource_id'])
    dbsession = DBSession()
    resource = dbsession.query(Resource).filter(Resource.id == resource_id).first()

    # checks
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    if not(request.user.is_administrator or resource.has_permission(FoclStructScope.edit_data, request.user)):
        raise HTTPForbidden()

    extent3857 = get_extent_by_resource_id(resource_id)
    extent4326 = _extent_3857_to_4326(extent3857)

    focl_layers = get_focl_layers_list()
    sit_plan_layers_type = get_sit_plan_layers_list()

    layers_styles = _get_layers_styles_items(request, resource_id)
    editable_layers_view_model = _create_editable_layers_view_model(layers_styles)
    playable_layers_view_model = _create_playable_layers_view_model(layers_styles)

    values = dict(
        resource_display_name=resource.display_name,
        show_header=True,
        focl_layers_type=focl_layers['focl'],
        objects_layers_type=focl_layers['objects'],
        real_layers_type=focl_layers['real'],
        sit_plan_layers_type=sit_plan_layers_type,
        extent=extent4326,
        editable_layers_info=editable_layers_view_model,
        playable_layers_info=playable_layers_view_model
    )

    return values


def _extent_3857_to_4326(extent3857):
    if not extent3857:
        return [-179, -82, 180, 82]
    projection_3857 = Proj(init='EPSG:3857')
    projection_4326 = Proj(init='EPSG:4326')
    x1, y1 = tuple(extent3857[0:2])
    x2, y2 = tuple(extent3857[2:4])

    extent4326 = list(transform(projection_3857, projection_4326, x1, y1)) + \
        list(transform(projection_3857, projection_4326, x2, y2))

    return extent4326


def _get_layers_styles_items(request, resource_id):
    layers_styles = []
    dbsession = DBSession()

    resource = dbsession.query(Resource).filter(Resource.id == resource_id).first()

    editable_layers_styles = get_editable_layers_styles(request)
    player_layers_styles = get_playable_layers_styles(request)

    for child_resource in resource.children:
        if child_resource.identity != VectorLayer.identity:
            continue
        if len(child_resource.keyname) < (GUID_LENGTH + 1):
            continue
        layer_keyname_without_guid = child_resource.keyname[0:-(GUID_LENGTH + 1)]
        if layer_keyname_without_guid not in editable_layers_styles:
            continue
        layers_styles.append({
            'resource': child_resource,
            'layer_keyname': layer_keyname_without_guid,
            'editor_styles': editable_layers_styles[layer_keyname_without_guid],
            'player_styles': player_layers_styles[layer_keyname_without_guid]
        })

    dbsession.close()

    return layers_styles


def _create_editable_layers_view_model(layers_styles):
    return _create_layers_view_model(layers_styles, 'editable')


def _create_playable_layers_view_model(layers_styles):
    return _create_layers_view_model(layers_styles, 'playable')


def _create_layers_view_model(layers_styles, layers_type):
    if layers_type == 'editable':
        prefix_style = 'editor'
    elif layers_type == 'playable':
        prefix_style = 'player'
    else:
        raise Exception('Unknown layers_type: "%s"' % layers_type)

    layers_model = {
        'default': [],
        'select': {}
    }

    for layer_styles_item in layers_styles:
        layers_model['default'].append({
            'id': layer_styles_item['resource'].id,
            'layerKeyname': layer_styles_item['layer_keyname'],
            'styles': layer_styles_item['%s_styles' % prefix_style]['default']
        })
        if 'select' in layer_styles_item['%s_styles' % prefix_style]:
            layers_model['select'][layer_styles_item['layer_keyname']] = \
                layer_styles_item['%s_styles' % prefix_style]['select']
    return layers_model


def get_focl_layers_list():
    layer_order = len(FOCL_LAYER_STRUCT) + len(OBJECTS_LAYER_STRUCT) + len(FOCL_REAL_LAYER_STRUCT) +\
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
    layers_template_path = path.join(ADMIN_BASE_PATH, 'real_layers_templates/')
    for vl_name in reversed(FOCL_REAL_LAYER_STRUCT):
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
                'id': vl_name,
                'children': [],
                'icon': vl_name,
                'order': layer_order
            })
        layer_order -= 1
    return layers


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
    dbsession = DBSession()
    resource = dbsession.query(Resource).filter(Resource.id == resource_id).first()

    extent = None
    for res in resource.children:
        if res.identity != VectorLayer.identity:
            continue

        tableinfo = TableInfo.from_layer(res)
        tableinfo.setup_metadata(tablename=res._tablename)

        columns = [db.func.st_astext(db.func.st_extent(db.text('geom')).label('box'))]
        query = sql.select(columns=columns, from_obj=tableinfo.table)
        extent_str = dbsession.connection().scalar(query)

        if extent_str:
            if not extent:
                extent = loads(extent_str).bounds
            else:
                new_extent = loads(extent_str).bounds
                extent = extent_union(extent, new_extent)

    dbsession.close()

    return extent_buff(extent, 2000)


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
    # все ВОСЛ и СИТ планы для присланных ид
    group_resources = dbsession.query(Resource)\
        .options(joinedload_all('children.children'))\
        .filter(Resource.id.in_(group_res_ids))\
        .all()

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
def get_focl_status(request):
    res_id = request.matchdict['id']
    dbsession = DBSession()

    try:
        focl_resource = dbsession.query(FoclStruct).get(res_id)
    except:
        raise HTTPNotFound()

    if not focl_resource:
        raise HTTPNotFound()

    if not focl_resource.has_permission(DataScope.write, request.user):
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
        report_line = dbsession.query(ConstructionStatusReport)\
            .filter(ConstructionStatusReport.focl_res_id == res_id)\
            .one()
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

    return success_response()


@view_config(renderer='json')
def editor_save_geom(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    if request.method != 'POST':
        return error_response(u'Метод не поддерживается! Необходим POST')

    try:
        updates = request.json_body

        db_session = DBSession
        transaction.manager.begin()

        for update in updates:
            res = db_session.query(VectorLayer)\
                .options(joinedload_all('parent'))\
                .filter(VectorLayer.id == update['layer'])\
                .first()
            if not res:
                return error_response(u'Редактируемый слой не найден')
            parent_res = res.parent
            if not parent_res:
                return error_response(u'Редактируемый слой некорректный (Слой вне объекта строительства)')
            # TODO: set check!
            if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)):
                return error_response(u'У вас недостаточно прав для редактирования данных')

            query = res.feature_query()
            query.geom()

            query.filter_by(id=update['id'])
            query.limit(1)

            feature = None
            for f in query():
                feature = f

            if not feature:
                return error_response(u'Редактируемый объект не найден')

            feature.geom = update['wkt']
            feature.fields['change_author'] = request.user.display_name or request.user.keyname
            feature.fields['change_date'] = datetime.now()

            if IWritableFeatureLayer.providedBy(res):
                res.feature_put(feature)
            else:
                return error_response(u'Ресурс не поддерживает хранение геометрий')

        transaction.manager.commit()
    except Exception as ex:
        return error_response(ex.message)

    return success_response()


@view_config(renderer='json')
def editor_delete_geom(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()
    if request.method != 'DELETE':
        return error_response(u'Метод не поддерживается! Необходим DELETE')
    try:
        deletes = request.json_body

        db_session = DBSession()
        transaction.manager.begin()

        for del_feat in deletes:
            res = db_session.query(VectorLayer)\
                .options(joinedload_all('parent'))\
                .filter(VectorLayer.id == del_feat['layer'])\
                .first()
            if not res:
                return error_response(u'Редактируемый слой не найден')
            parent_res = res.parent
            if not parent_res:
                return error_response(u'Редактируемый слой некорректный (Слой вне объекта строительства)')
            if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)):
                return error_response(u'У вас недостаточно прав для редактирования данных')

            if IWritableFeatureLayer.providedBy(res):
                res.feature_delete(del_feat['id'])
            else:
                return error_response(u'Ресурс не поддерживает работу с геометриями')

        transaction.manager.commit()
    except Exception as ex:
        return error_response(ex.message)

    return success_response()


@view_config(renderer='json')
def editor_create_geom(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    if request.method != 'PUT':
        return error_response(u'Метод не поддерживается! Необходим PUT')

    try:
        create_info = request.json_body
        start_layer_id = create_info['start']['ngwLayerId']
        end_layer_id = create_info['end']['ngwLayerId']
        start_feat_id = create_info['start']['ngwFeatureId']
        end_feat_id = create_info['end']['ngwFeatureId']
        new_obj_type = create_info['type']

        db_session = DBSession()
        transaction.manager.begin()

        # get source layers
        start_point_layer = db_session.query(VectorLayer)\
            .options(joinedload_all('parent'))\
            .filter(VectorLayer.id == start_layer_id)\
            .first()

        end_point_layer = db_session.query(VectorLayer)\
            .options(joinedload_all('parent'))\
            .filter(VectorLayer.id == end_layer_id)\
            .first()

        if not start_point_layer or not end_point_layer:
            return error_response(u'Cлой с исходными данными не найден')

        if start_point_layer.parent != end_point_layer.parent:
            return error_response(u'Cлои с исходными данными не в одном проекте строительства')

        # get destination layers
        parent_res = start_point_layer.parent
        if not parent_res:
            return error_response(u'Не найден объект строительства')
        if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)):
            return error_response(u'У вас недостаточно прав для редактирования данных')

        if new_obj_type == 'vols':
            target_layer_type = 'actual_real_optical_cable'
        elif new_obj_type == 'stp':
            target_layer_type = 'actual_real_special_transition'
        else:
            target_layer_type = None

        target_layer = None
        for child_resource in parent_res.children:
            if not child_resource.keyname:
                continue
            if len(child_resource.keyname) < (GUID_LENGTH + 1):
                continue
            layer_keyname_without_guid = child_resource.keyname[0:-(GUID_LENGTH + 1)]
            if target_layer_type == layer_keyname_without_guid:
                target_layer = child_resource
                break

        if not target_layer:
            return error_response(u'Не найден слой для сохранения нового объекта')

        # get source points
        query = start_point_layer.feature_query()
        query.geom()

        query.filter_by(id=start_feat_id)
        query.limit(1)

        start_point_feat = None
        for f in query():
            start_point_feat = f

        if not start_point_feat:
            return error_response(u'Стартовая точка не найдена')

        query = end_point_layer.feature_query()
        query.geom()

        query.filter_by(id=end_feat_id)
        query.limit(1)

        end_point_feat = None
        for f in query():
            end_point_feat = f

        if not start_point_feat:
            return error_response(u'Конечная точка не найдена')

        # generate new feat and save it
        info = ConstructFoclLineReactor.get_segment_info([start_point_feat, end_point_feat])
        feature = Feature(
            fields=info,
            geom=MultiLineString([[start_point_feat.geom[0].coords[0], end_point_feat.geom[0].coords[0]]])
        )

        if IWritableFeatureLayer.providedBy(target_layer):
            target_layer.feature_create(feature)
        else:
            return error_response(u'Ресурс не поддерживает хранение геометрий')

        transaction.manager.commit()
    except Exception as ex:
        return error_response(ex.message)

    return success_response()


@view_config(renderer='json')
def construct_line(request):
    res_id = request.matchdict['id']
    if request.user.keyname == 'guest':
        raise HTTPForbidden()
    if request.method != 'POST':
        resp = {'status': 'error', 'message': u'Метод не поддерживается! Необходим POST'}
        return Response(json.dumps(resp), status=400)

    try:
        db_session = DBSession()
        transaction.manager.begin()

        fs_resources = db_session.query(FoclStruct).filter(FoclStruct.id == int(res_id))  # all()
        for fs in fs_resources:
            ConstructFoclLineReactor.smart_construct_line(fs)
            ConstructSpecTransitionLineReactor.smart_construct_line(fs)

        transaction.manager.commit()
    except Exception as ex:
        resp = {'status': 'error', 'message': ex.message}
        return Response(json.dumps(resp), status=400)

    return success_response()


@view_config(renderer='json')
def reset_point(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    if request.method != 'POST':
        return error_response(u'Метод не поддерживается! Необходим POST')

    try:
        reset_info = request.json_body

        db_session = DBSession
        transaction.manager.begin()

        # get fact layer
        res = db_session.query(VectorLayer) \
            .options(joinedload_all('parent')) \
            .filter(VectorLayer.id == reset_info['ngwLayerId']) \
            .first()

        if not res:
            return error_response(u'Редактируемый слой не найден')
        if not res.keyname or not res.keyname.startswith('actual_'):
            return error_response(u'Редактируемый слой некорректный (Слой не ясвляется фактическим актуальным)')

        parent_res = res.parent
        if not parent_res:
            return error_response(u'Редактируемый слой некорректный (Слой вне объекта строительства)')
        if not (
            request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)):
            return error_response(u'У вас недостаточно прав для редактирования данных')

        # get fact point
        query = res.feature_query()
        query.geom()

        query.filter_by(id=reset_info['ngwFeatureId'])
        query.limit(1)

        feature = None
        for f in query():
            feature = f

        if not feature:
            return error_response(u'Редактируемый объект не найден')

        # get global id of feat
        feat_guid = feature.fields['feat_guid']


        # try to get mirror layer
        actual_layer_name = '_'.join(res.keyname.rsplit('_')[0:-1])
        real_layer_name = actual_layer_name.replace('actual_', '')
        real_layer = None

        for lyr in parent_res.children:
            if lyr.keyname:
                lyr_name = '_'.join(lyr.keyname.rsplit('_')[0:-1])
            else:
                continue
            if real_layer_name == lyr_name:
                real_layer = lyr

        if not real_layer:
            return error_response(u'Слой с исходными данными не найден')

        # try to get original feat
        query_real = real_layer.feature_query()
        query_real.geom()
        query_real.filter_by(feat_guid=feat_guid)
        query_real.limit(1)

        original_feature = None
        for f in query_real():
            original_feature = f

        if not original_feature:
            return error_response(u'Исходный объект не найден')

        # reset geom
        old_point = feature.geom
        new_point = original_feature.geom
        feature.geom = original_feature.geom

        # update feature
        if IWritableFeatureLayer.providedBy(res):
            res.feature_put(feature)
        else:
            return error_response(u'Ресурс не поддерживает хранение геометрий')

        # replace lines
        line_lyrs = get_line_lyrs(parent_res)
        replace_lines_to_point(line_lyrs, old_point, new_point)

        # TODO: photo reset!

        transaction.manager.commit()
    except Exception as ex:
        return error_response(ex.message)

    return success_response()


def get_line_lyrs(parent_res):
    search_names = ['actual_real_optical_cable', 'actual_real_special_transition']
    result_layers = []

    for lyr in parent_res.children:
        # get name
        if lyr.keyname:
            lyr_name = '_'.join(lyr.keyname.rsplit('_')[0:-1])
        else:
            continue
        # check
        for search_name in search_names:
            if search_name == lyr_name:
                result_layers.append(lyr)
                break

    return result_layers


def replace_lines_to_point(line_lyrs, old_point, new_point):
    x = old_point[0].coords[0][0]
    y = old_point[0].coords[0][1]
    buff = Polygon([(x-1, y-1), (x-1, y+1), (x+1, y+1), (x+1, y-1), (x-1, y-1)])
    buff.srid = old_point.srid

    for line_lyr in line_lyrs:
        # get intersection lines
        query = line_lyr.feature_query()
        #query.intersects(buff)
        query.geom()

        # replace point in lines
        for f in query():
            line = f.geom[0]
            new_line_points = []
            need_reconstruct = False
            for vertex in line.coords:
                if vertex == old_point[0].coords[0]:
                    new_line_points.append(new_point[0].coords[0])
                    need_reconstruct = True
                else:
                    new_line_points.append(vertex)

            if need_reconstruct:
                new_geom = MultiLineString([new_line_points,])
                f.geom = new_geom
                line_lyr.feature_put(f)


def get_layer_by_type(parent_res, layer_type):
    layer = None

    for lyr in parent_res.children:
        if lyr.keyname:
            lyr_name = '_'.join(lyr.keyname.rsplit('_')[0:-1])
        else:
            continue
        if layer_type == lyr_name:
            layer = lyr
            break
    return layer


def reset_all_layer(request):
    # check
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    if request.method != 'POST':
        return error_response(u'Метод не поддерживается! Необходим POST')

    try:
        db_session = DBSession
        transaction.manager.begin()

        # get root resource
        res_id = request.matchdict['id']
        parent_res = db_session.query(Resource) \
            .options(joinedload_all('children')) \
            .filter(Resource.id == res_id) \
            .first()

        if not parent_res:
            return error_response(u'Редактируемый объект строительства не найден')
        if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)):
            return error_response(u'У вас недостаточно прав для редактирования данных')

        line_lyrs = get_line_lyrs(parent_res)

        for actual_layer_name in ['actual_real_optical_cable_point',
                                  'actual_real_special_transition_point',
                                  'actual_real_fosc',
                                  'actual_real_optical_cross',
                                  'actual_real_access_point']:
            # get fact layer
            res = get_layer_by_type(parent_res, actual_layer_name)

            if not res:
                continue  # mmm... wtf?

            # try to get mirror layer
            real_layer_name = actual_layer_name.replace('actual_', '')
            real_layer = get_layer_by_type(parent_res, real_layer_name)

            if not real_layer:
                continue  # mmm... wtf?

            # reset all points from original layers
            query = real_layer.feature_query()
            query.geom()

            for original_feature in query():

                # get global id of feat
                feat_guid = original_feature.fields['feat_guid']

                # try to get actual feat
                query_act = res.feature_query()
                query_act.geom()
                query_act.filter_by(feat_guid=feat_guid)
                query_act.limit(1)

                feature = None
                for f in query_act():
                    feature = f

                if not feature:
                    continue  # temporary
                    # it's was deleted? recreate it
                    new_feat = Feature(fields=original_feature.fields, geom=original_feature.geom)
                    new_feat.fields['change_author'] = u'Мобильное приложение'
                    new_feat.fields['change_date'] = new_feat.fields['built_date']
                    feature = res.feature_create(new_feat)
                else:
                    # point already exists

                    # reset geom and fields
                    old_point = feature.geom
                    new_point = original_feature.geom
                    feature.geom = original_feature.geom

                    for k,v in original_feature.fields.iteritems():
                        feature.fields[k] = v
                    feature.fields['change_author'] = u'Мобильное приложение'
                    feature.fields['change_date'] = feature.fields['built_date']

                    # update feature
                    if IWritableFeatureLayer.providedBy(res):
                        res.feature_put(feature)
                    else:
                        return error_response(u'Ресурс не поддерживает хранение геометрий')

                    # replace lines
                    replace_lines_to_point(line_lyrs, old_point, new_point)

                # TODO: photo reset!

        transaction.manager.commit()
    except Exception as ex:
        return error_response(ex.message)

    return success_response()


def get_not_editable_features(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    result = {}

    db_session = DBSession

    # get root resource
    res_id = request.matchdict['id']
    parent_res = db_session.query(Resource) \
        .options(joinedload_all('children')) \
        .filter(Resource.id == res_id) \
        .first()

    if not parent_res:
        return error_response(u'Редактируемый объект строительства не найден')
    if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)):
        return error_response(u'У вас недостаточно прав для редактирования данных')

    # get acceptable parts
    acc_parts_lyr = get_layer_by_type(parent_res, 'accepted_part')
    if not acc_parts_lyr:
        return error_response(u'Слой с принятыми участками не найден')

    acc_parts = []
    query = acc_parts_lyr.feature_query()
    query.geom()
    for f in query():
        acc_parts.append(f.geom[0])


    if acc_parts:
        # get all intersected lines objects
        inter_line_geoms = []

        line_lyrs = get_line_lyrs(parent_res)
        for line_lyr in line_lyrs:
            # get all geoms intersected with acc_parts
            intersected_feats = []
            query = line_lyr.feature_query()
            query.geom()
            for f in query():
                line_geom = f.geom[0]
                for acc_geom in acc_parts:
                    inters = line_geom.intersection(acc_geom)
                    if inters and inters.geom_type in ('LineString', 'MultiLineString'):
                        intersected_feats.append(f.id)
                        inter_line_geoms.append(line_geom)
                        break
                    if inters and inters.geom_type == 'Point':
                        # additional check for distance second point
                        acc_segments = [map(lambda x: acc_geom.coords[x:x+1], range(len(acc_geom.coords)-1))]
                        for acc_segment in acc_segments:
                            if acc_segment[0] != acc_segment[1]:  # dummy check
                                dist1 = Point(acc_segment[0]).distance(line_geom)
                                dist2 = Point(acc_segment[1]).distance(line_geom)
                                if dist1 < 0.0000001 and dist2 < 0.0000001:
                                    intersected_feats.append(f.id)
                                    inter_line_geoms.append(line_geom)
                                    break

            if intersected_feats:
                result[str(line_lyr.id)] = dict(map(lambda x: (str(x), 1), set(intersected_feats)))


        # get all point objects
        for point_lyr_id in ['actual_real_optical_cable_point',
                             'actual_real_special_transition_point',
                             'actual_real_fosc',
                             'actual_real_optical_cross',
                             'actual_real_access_point']:
            # get fact layer
            point_lyr = get_layer_by_type(parent_res, point_lyr_id)

            if not point_lyr:
                continue  # mmm... wtf?

            intersected_feats = []
            query = point_lyr.feature_query()
            query.geom()
            for f in query():
                point_geom = f.geom
                for acc_geom in acc_parts:
                    if point_geom.intersects(acc_geom):
                        intersected_feats.append(f.id)
                        break
                for line_geom in inter_line_geoms:
                    if point_geom.intersects(line_geom):
                        intersected_feats.append(f.id)
                        break

            if intersected_feats:
                result[str(point_lyr.id)] = dict(map(lambda x: (str(x), 1), set(intersected_feats)))

    return Response(json.dumps(result))
