# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import re

from nextgisweb.pyramid import viewargs
from pyramid.response import Response
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from ..dgrid_viewmodels import *


@viewargs(renderer='json')
def get_districts(request):
    session = DBSession()

    domain_class = District
    items_query = session.query(domain_class)

    rel_attrs = filter(lambda c: 'relation' in c, districts_dgrid_viewmodel)
    for rel_attr in rel_attrs:
        items_query = items_query.options(joinedload(rel_attr['relation']['relation-field']))

    sort_keys = filter(lambda k: 'sort(' in k, request.GET.keys())
    if sort_keys:
        dojo_order, grid_field_name = re.findall('.+([+,-])(\w+)', request.query_string)[0]
        item_config = filter(lambda x: x['grid-property'] == grid_field_name, districts_dgrid_viewmodel)[0]
        if 'relation' in item_config:
            sorting_field = item_config['relation']['sort-field']
        else:
            field_name = item_config['data-property']
            sorting_field = domain_class.__table__.c[field_name]

        if dojo_order == '+':
            items_query = items_query.order_by(sorting_field.asc())
        elif dojo_order == '-':
            items_query = items_query.order_by(sorting_field.desc())

    grid_range = None
    if 'Range' in request.headers:
        grid_range = request.headers['Range']
        start, stop = re.findall('items=(\d+)-(\d+)', grid_range)[0]
        items_query = items_query.slice(int(start), int(stop) + 1)

    result = []
    for item_query in items_query:
        result_item = {}
        for item_config in districts_dgrid_viewmodel:
            if 'relation' in item_config:
                rel_attr_name = item_config['data-property']
                rel_attr = item_query.__getattribute__(rel_attr_name)
                if rel_attr:
                    result_item[rel_attr_name] = rel_attr.__getattribute__(item_config['relation']['label'])
                    result_item[rel_attr_name + '_id'] = rel_attr.__getattribute__(item_config['relation']['id'])
                else:
                    result_item[rel_attr_name] = None
                    result_item[rel_attr_name + '_id'] = None
            else:
                result_item[item_config['grid-property']] = \
                    item_query.__getattribute__(item_config['data-property'])
        result.append(result_item)

    response = Response(json.dumps(result))

    if grid_range:
        count_all_rows = session.query(func.count(domain_class.id)).scalar()
        response.headers[str('Content-Range')] = str(grid_range + '/' + str(count_all_rows))

    return response
