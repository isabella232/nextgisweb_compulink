# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from pyramid.view import (
    view_config,
    view_defaults
)
import re
from nextgisweb.pyramid import viewargs
from pyramid.response import Response
from pyramid.renderers import render_to_response
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from ..dgrid_viewmodels import *
import transaction


class ReferenceBookViewBase(object):
    def __init__(self, request):
        self.request = request

    def _get_page(self, dgrid_viewmodel, template):
        columns_settings = []
        for config_item in dgrid_viewmodel:
            grid_config_store_item = {
                'label': config_item['label'],
                'field': config_item['grid-property']
            }
            grid_config_store_item.update(config_item['cell-prop'])
            columns_settings.append(grid_config_store_item)

        view_data = {
            'columnsSettings': columns_settings,
            'dynmenu': self.request.env.pyramid.control_panel
        }

        return render_to_response(template, view_data, request=self.request)

    def _get_items(self, reference_book_type, dgrid_viewmodel):
        session = DBSession()

        items_query = session.query(reference_book_type)

        rel_attrs = filter(lambda c: 'relation' in c, dgrid_viewmodel)
        for rel_attr in rel_attrs:
            relation_field = rel_attr['relation']['relation-field']
            items_query = items_query.outerjoin(relation_field).options(joinedload(relation_field))

        sort_keys = filter(lambda k: 'sort(' in k, self.request.GET.keys())
        if sort_keys:
            dojo_order, grid_field_name = re.findall('.+([+,-])(\w+)', self.request.query_string)[0]
            item_config = filter(lambda x: x['grid-property'] == grid_field_name, dgrid_viewmodel)[0]
            if 'relation' in item_config:
                sorting_field = item_config['relation']['sort-field']
            else:
                field_name = item_config['data-property']
                sorting_field = reference_book_type.__table__.c[field_name]

            if dojo_order == '+':
                items_query = items_query.order_by(sorting_field.asc())
            elif dojo_order == '-':
                items_query = items_query.order_by(sorting_field.desc())

        grid_range = None
        if 'Range' in self.request.headers:
            grid_range = self.request.headers['Range']
            start, stop = re.findall('items=(\d+)-(\d+)', grid_range)[0]
            items_query = items_query.slice(int(start), int(stop) + 1)

        result = []
        for item_query in items_query:
            result_item = {}
            for item_config in dgrid_viewmodel:
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
            count_all_rows = session.query(func.count(reference_book_type.id)).scalar()
            response.headers[str('Content-Range')] = str(grid_range + '/' + str(count_all_rows))

        return response

    def _get_item(self, reference_book_type, dgrid_viewmodel, item_id):
        session = DBSession()
        item_query = session.query(reference_book_type)
        item_query = item_query.filter_by(id=item_id)

        rel_attrs = filter(lambda c: 'relation' in c, dgrid_viewmodel)
        for rel_attr in rel_attrs:
            relation_field = rel_attr['relation']['relation-field']
            item_query = item_query.outerjoin(relation_field).options(joinedload(relation_field))

        item_db = item_query.one()

        result_item = {}
        for item_config in dgrid_viewmodel:
            if 'relation' in item_config:
                rel_attr_name = item_config['data-property']
                rel_attr = item_db.__getattribute__(rel_attr_name)
                if rel_attr:
                    result_item[rel_attr_name] = rel_attr.__getattribute__(item_config['relation']['label'])
                    result_item[rel_attr_name + '_id'] = rel_attr.__getattribute__(item_config['relation']['id'])
                else:
                    result_item[rel_attr_name] = None
                    result_item[rel_attr_name + '_id'] = None
            else:
                result_item[item_config['grid-property']] = \
                    item_db.__getattribute__(item_config['data-property'])

        return Response(json.dumps(result_item))
