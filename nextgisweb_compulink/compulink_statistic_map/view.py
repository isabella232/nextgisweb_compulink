# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import os
from nextgisweb_compulink.compulink_reporting.view import get_user_writable_focls, get_project_focls
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
    PROJECT_STATUS_BUILT, FoclStructScope, Region, District, ConstructObject, FederalDistrict
from ..compulink_admin.well_known_resource import DICTIONARY_GROUP_KEYNAME, FEDERAL_KEYNAME, REGIONS_KEYNAME, \
    REGIONS_ID_FIELD, DISTRICT_KEYNAME
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
PERM_READ = DataScope.read


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.statistic_map.map',
        '/compulink/statistic_map').add_view(show_map)

    config.add_route(
        'compulink.statistic_map.get_federal_districts_layer',
        '/compulink/statistic_map/get_federal_districts_layer').add_view(get_federal_districts_layer)

    config.add_route(
        'compulink.statistic_map.get_regions_layer',
        '/compulink/statistic_map/get_regions_layer').add_view(get_regions_layer)

    config.add_route(
        'compulink.statistic_map.get_district_layer',
        '/compulink/statistic_map/get_district_layer').add_view(get_district_layer)



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
        .filter(ResourceACLRule.principal_id==user.principal_id)\
        .filter(ResourceACLRule.scope==DataScope.identity)\
        .options(joinedload_all(ResourceACLRule.resource))

    #todo: user groups explicit rules???

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
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    values = dict(
        show_header=True,
    )

    return render_to_response('nextgisweb_compulink:compulink_statistic_map/templates/statistic_webmap/display.mako',
                              values,
                              request=request)


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


class ColorizeProxy(object):

    def __init__(self, query):
        self.query = query
        self.result = self.query.__geo_interface__

        self.result['crs'] = dict(type='name', properties=dict(
            name='EPSG:3857'))

    def colorize(self, color_func):
        for feat in self.result['features']:
            feat['properties']['color'] = color_func(feat)

    def filter(self, filter_funct):
        self.result['features'] = list(f for f in self.result['features'] if filter_funct(f))


    @property
    def __geo_interface__(self):
        return self.result


@view_config(renderer='json')
def get_federal_districts_layer(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    project_filter = request.params.get('project_filter', None)
    if project_filter is None:
        raise HTTPBadRequest('Set "project_filter" param!')

    # --- attribute parts
    dbsession = DBSession()
    # all FD
    fds = dbsession.query(FederalDistrict).order_by(FederalDistrict.name).all()
    # filter by rights
    allowed_res_ids = None
    if not request.user.is_administrator:
        allowed_res_ids = get_user_writable_focls(request.user)
    # filter by struct
    project_res_ids = None
    if project_filter and project_filter != 'root':
        project_res_ids = get_project_focls(project_filter)

    fd_colors = {}
    for fd in fds:
        co_query = dbsession.query(ConstructObject)
        if allowed_res_ids:
            co_query = co_query.filter(ConstructObject.resource_id.in_(allowed_res_ids))
        if project_res_ids:
            co_query = co_query.filter(ConstructObject.resource_id.in_(project_res_ids))
        # all regions in fd
        regions_ids = get_child_regions_ids(fd.id)
        co_query = co_query.filter(ConstructObject.region_id.in_(regions_ids))

        construct_objects = co_query.all()

        fd_colors[fd.id] = get_color_for_co(construct_objects)

    # --- geometry part
    geom_dict_resource = dbsession.query(Resource).filter(Resource.keyname == FEDERAL_KEYNAME).one()
    query = geom_dict_resource.feature_query()
    query.geom()
    result = ColorizeProxy(query())

    # --- merge result
    result.colorize(lambda feat: fd_colors[feat['properties']['fed_id']] if feat['properties']['fed_id'] in fd_colors.keys() else '#A0A0A0')

    # --- return
    content_disposition = (b'attachment; filename=%s.geojson'
                           % FEDERAL_KEYNAME)
    return Response(
        geojson.dumps(result, ensure_ascii=False, cls=ComplexEncoder),
        content_type=b'application/json',
        content_disposition=content_disposition)\

@view_config(renderer='json')
def get_regions_layer(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    project_filter = request.params.get('project_filter', None)
    if project_filter is None:
        raise HTTPBadRequest('Set "project_filter" param!')

    fed_id = request.params.get('fed_id', None)
    if fed_id is None:
        raise HTTPBadRequest('Set "fed_id" param!')
    fed_id = int(fed_id) #todo check


    # --- attribute parts
    dbsession = DBSession()
    # all regions in FD
    regions = dbsession.query(Region).order_by(Region.name).filter(Region.federal_dist_id==fed_id).all()
    regions_ids = list(str(x.id) for x in regions)

    # filter by rights
    allowed_res_ids = None
    if not request.user.is_administrator:
        allowed_res_ids = get_user_writable_focls(request.user)
    # filter by struct
    project_res_ids = None
    if project_filter and project_filter != 'root':
        project_res_ids = get_project_focls(project_filter)

    region_colors = {}
    for region in regions:
        co_query = dbsession.query(ConstructObject)
        if allowed_res_ids:
            co_query = co_query.filter(ConstructObject.resource_id.in_(allowed_res_ids))
        if project_res_ids:
            co_query = co_query.filter(ConstructObject.resource_id.in_(project_res_ids))

        co_query = co_query.filter(ConstructObject.region_id==region.id)

        construct_objects = co_query.all()

        region_colors[str(region.id)] = get_color_for_co(construct_objects)

    # --- geometry part
    geom_dict_resource = dbsession.query(Resource).filter(Resource.keyname == REGIONS_KEYNAME).one()
    query = geom_dict_resource.feature_query()
    query.geom()
    result = ColorizeProxy(query())
    # filter by federal
    result.filter(lambda feat: feat['properties']['reg_id'] in regions_ids)

    # --- merge result
    result.colorize(lambda feat: region_colors[feat['properties']['reg_id']] if feat['properties']['reg_id'] in region_colors.keys() else '#A0A0A0')

    # --- return
    content_disposition = (b'attachment; filename=%s.geojson'
                           % REGIONS_KEYNAME)
    return Response(
        geojson.dumps(result, ensure_ascii=False, cls=ComplexEncoder),
        content_type=b'application/json',
        content_disposition=content_disposition)


@view_config(renderer='json')
def get_district_layer(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    project_filter = request.params.get('project_filter', None)
    if project_filter is None:
        raise HTTPBadRequest('Set "project_filter" param!')

    reg_id = request.params.get('reg_id', None)
    if reg_id is None:
        raise HTTPBadRequest('Set "reg_id" param!')
    fed_id = int(reg_id) #todo check


    # --- attribute parts
    dbsession = DBSession()
    # all districts in regions
    districts = dbsession.query(District).order_by(District.name).filter(District.region_id==reg_id).all()
    districts_ids = list(str(x.id) for x in districts)

    # filter by rights
    allowed_res_ids = None
    if not request.user.is_administrator:
        allowed_res_ids = get_user_writable_focls(request.user)
    # filter by struct
    project_res_ids = None
    if project_filter and project_filter != 'root':
        project_res_ids = get_project_focls(project_filter)

    district_colors = {}
    for district in districts:
        co_query = dbsession.query(ConstructObject)
        if allowed_res_ids:
            co_query = co_query.filter(ConstructObject.resource_id.in_(allowed_res_ids))
        if project_res_ids:
            co_query = co_query.filter(ConstructObject.resource_id.in_(project_res_ids))

        co_query = co_query.filter(ConstructObject.district_id==district.id)

        construct_objects = co_query.all()

        district_colors[str(district.id)] = get_color_for_co(construct_objects)

    # --- geometry part
    geom_dict_resource = dbsession.query(Resource).filter(Resource.keyname == DISTRICT_KEYNAME).one()
    query = geom_dict_resource.feature_query()
    query.geom()
    result = ColorizeProxy(query())
    # filter by federal
    result.filter(lambda feat: feat['properties']['dist_id'] in districts_ids)

    # --- merge result
    result.colorize(lambda feat: district_colors[feat['properties']['dist_id']] if feat['properties']['dist_id'] in district_colors.keys() else '#A0A0A0')

    # --- return
    content_disposition = (b'attachment; filename=%s.geojson'
                           % DISTRICT_KEYNAME)
    return Response(
        geojson.dumps(result, ensure_ascii=False, cls=ComplexEncoder),
        content_type=b'application/json',
        content_disposition=content_disposition)


def get_child_regions_ids(federal_district_id):
    #TODO: check
    dbsession = DBSession()
    ids = dbsession.query(Region.id).filter(Region.federal_dist_id==federal_district_id)
    return list(ids.all())

def get_color_for_co(construct_objects):
    colors = ['LightGreen', 'yellow', 'coral', 'red']
    import random
    return colors[random.randint(0, 3)]