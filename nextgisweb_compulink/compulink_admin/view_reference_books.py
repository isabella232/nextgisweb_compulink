# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from sqlalchemy import and_, func
from nextgisweb import DBSession
from nextgisweb.resource import Widget, Resource
from nextgisweb import dynmenu as dm
from nextgisweb.pyramid import viewargs
from pyramid.response import Response
from .model import Region
import re
import json
import transaction


def add_routes(config):
    config.add_route(
        'compulink_admin.reference_books.region',
        '/compulink/admin/reference_books/region').add_view(get_region_page)
    config.add_route(
        'compulink_admin.services.reference_books.region.get',
        'compulink/services/reference_books/region/').add_view(get_regions)
    config.add_route(
        'compulink_admin.services.reference_books.region.get_one',
        'compulink/services/reference_books/region/{id}').add_view(get_region)
    config.add_route(
        'compulink_admin.reference_books.district',
        '/compulink/admin/reference_books/district').add_view(get_district_page)
    config.add_route(
        'compulink_admin.reference_books.project',
        '/compulink/admin/reference_books/project').add_view(get_project_page)
    config.add_route(
        'compulink_admin.reference_books.construct_object',
        '/compulink/admin/reference_books/construct_object').add_view(get_construct_object_page)


regions_data_grid = [
    {
        'data-property': 'id',
        'grid-property': 'id',
        'name': 'Идентификатор',
        'cell-prop': {

        }
    },
    {
        'data-property': 'name',
        'grid-property': 'name',
        'name': 'Название',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'short_name',
        'grid-property': 'short_name',
        'name': 'Краткое название',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'region_code',
        'grid-property': 'region_code',
        'name': 'Код региона',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    }
]


@viewargs(renderer='nextgisweb_compulink:compulink_admin/template/reference_books/regions.mako')
def get_region_page(request):
    columns_settings = []
    for config_item in regions_data_grid:
        grid_config_store_item = {
            'label': config_item['name'],
            'field': config_item['grid-property']
        }
        grid_config_store_item.update(config_item['cell-prop'])
        columns_settings.append(grid_config_store_item)

    return {
        'title': u'Справочник регионов',
        'columnsSettings': columns_settings,
        'dynmenu': request.env.pyramid.control_panel
    }


@viewargs(renderer='json')
def get_regions(request):
    session = DBSession()

    domain_class = Region
    regions = session.query(domain_class)

    sort_keys = filter(lambda k: 'sort(' in k, request.GET.keys())
    if sort_keys:
        dojo_order, grid_field_name = re.findall('.+([+,-])(\w+)', request.query_string)[0]
        field_name = filter(lambda x: x['grid-property'] == grid_field_name, regions_data_grid)[0]['data-property']
        if dojo_order == '+':
            regions = regions.order_by(domain_class.__table__.c[field_name].asc())
        elif dojo_order == '-':
            regions = regions.order_by(domain_class.__table__.c[field_name].desc())

    grid_range = None
    if 'Range' in request.headers:
        grid_range = request.headers['Range']
        start, stop = re.findall('items=(\d+)-(\d+)', grid_range)[0]
        regions = regions.slice(int(start), int(stop) + 1)

    result = []
    for region in regions:
        result_item = {}
        for item_config in regions_data_grid:
            result_item[item_config['grid-property']] = region.__getattribute__(item_config['data-property'])
        result.append(result_item)

    response = Response(json.dumps(result))

    if grid_range:
        count_all_rows = session.query(func.count(domain_class.id)).scalar()
        response.headers[str('Content-Range')] = str(grid_range + '/' + str(count_all_rows))

    return response


@viewargs(renderer='json')
def get_region(request):
    if request.method == 'PUT':
        return put_region(request)

    region_id = request.matchdict['id']

    if region_id == 'undefined':
        return get_regions(request)

    session = DBSession()
    region = session.query(Region).filter(Region.id == region_id).one()

    result = {}
    for item_config in regions_data_grid:
        result[item_config['grid-property']] = region.__getattribute__(item_config['data-property'])

    return Response(json.dumps(result))


@viewargs(renderer='json')
def put_region(request):
    region_id = request.matchdict['id']

    item_updatable = {}
    for item_config in regions_data_grid:
        item_updatable[item_config['data-property']] = request.json[item_config['grid-property']]

    session = DBSession()
    session.query(Region).filter(Region.id == region_id).update(item_updatable)
    transaction.commit()

    return Response(json.dumps(item_updatable))


@viewargs(renderer='nextgisweb_compulink:compulink_admin/template/reference_books/districts.mako')
def get_district_page(request):
    return {
        'title': u'Справочник районов'
    }


@viewargs(renderer='nextgisweb_compulink:compulink_admin/template/reference_books/projects.mako')
def get_project_page(request):
    return {
        'title': u'Справочник проектов'
    }


@viewargs(renderer='nextgisweb_compulink:compulink_admin/template/reference_books/construct_objects.mako')
def get_construct_object_page(request):
    return {
        'title': u'Справочник объектов строительства'
    }
