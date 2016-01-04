# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from sqlalchemy import and_, func
from nextgisweb import DBSession
from nextgisweb.resource import Widget, Resource
from nextgisweb import dynmenu as dm
from nextgisweb.pyramid import viewargs
from pyramid.response import Response
from nextgisweb_compulink.compulink_admin.model import Region
from ..viewmodels.regions import regions_dgrid_viewmodel
import re
import json
import transaction


@viewargs(renderer='json')
def get_regions(request):
    session = DBSession()

    domain_class = Region
    regions = session.query(domain_class)

    sort_keys = filter(lambda k: 'sort(' in k, request.GET.keys())
    if sort_keys:
        dojo_order, grid_field_name = re.findall('.+([+,-])(\w+)', request.query_string)[0]
        field_name = filter(lambda x: x['grid-property'] == grid_field_name,
                            regions_dgrid_viewmodel)[0]['data-property']
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
        for item_config in regions_dgrid_viewmodel:
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
    for item_config in regions_dgrid_viewmodel:
        result[item_config['grid-property']] = region.__getattribute__(item_config['data-property'])

    return Response(json.dumps(result))


@viewargs(renderer='json')
def put_region(request):
    region_id = request.matchdict['id']

    item_updatable = {}
    for item_config in regions_dgrid_viewmodel:
        item_updatable[item_config['data-property']] = request.json[item_config['grid-property']]

    session = DBSession()
    session.query(Region).filter(Region.id == region_id).update(item_updatable)
    transaction.commit()

    return Response(json.dumps(item_updatable))
