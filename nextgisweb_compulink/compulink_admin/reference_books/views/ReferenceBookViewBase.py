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


dgrid_widget_name_regex = re.compile(r'[\"\']widget=>(\w+)[\"\']', re.IGNORECASE)
dgrid_object_regex = re.compile(r'[\"\']object=>(.+)=end[\"\']', re.IGNORECASE)


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

            if 'relation' in config_item:
                relation_section = config_item['relation']
                if 'editorArgs' in grid_config_store_item and grid_config_store_item['editorArgs'] == '[data]':
                    grid_config_store_item['editorArgs'] = []
                    session = DBSession()
                    relation_items = session\
                        .query(relation_section['type'])\
                        .order_by(relation_section['sort-field'])
                    for relation_item in relation_items:
                        grid_config_store_item['editorArgs'].append([
                            relation_item.__getattribute__(relation_section['id']),
                            relation_item.__getattribute__(relation_section['label'])
                        ])

            columns_settings.append(grid_config_store_item)

        columns_settings = json.dumps(columns_settings)
        columns_settings = dgrid_widget_name_regex.sub(lambda m: m.group(1), columns_settings)
        columns_settings = dgrid_object_regex.sub(lambda m: m.group(1), columns_settings)

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
        for item_db in items_query:
            result_item = self._build_item_for_response(dgrid_viewmodel, item_db)
            result.append(result_item)

        response = Response(json.dumps(result))

        if grid_range:
            count_all_rows = session.query(func.count(reference_book_type.id)).scalar()
            response.headers[str('Content-Range')] = str(grid_range + '/' + str(count_all_rows))

        return response

    def _get_item(self, reference_book_type, dgrid_viewmodel, item_id):
        item_db = self._get_query_item_joinedload(reference_book_type, dgrid_viewmodel, item_id, None).one()
        result_item = self._build_item_for_response(dgrid_viewmodel, item_db)
        return Response(json.dumps(result_item))

    def _update_item(self, reference_book_type, dgrid_viewmodel, item_id):
        session, relation_items = DBSession(), {}
        for config_item in dgrid_viewmodel:
            if 'relation' in config_item:
                new_relation_item_id = self.request.json[config_item['grid-property'] + '_id']
                new_relation_item = session.query(config_item['relation']['type'])\
                    .filter_by(id=new_relation_item_id).one()
                relation_items[config_item['data-property']] = {
                    'id': new_relation_item.id,
                    'item': new_relation_item
                }

        transaction.commit()

        session = DBSession()
        item_db = self._get_query_item_joinedload(reference_book_type, dgrid_viewmodel, item_id, session).one()

        for config_item in dgrid_viewmodel:
            if 'relation' in config_item:
                current_relation_item_id = item_db.\
                    __getattribute__(config_item['data-property']).\
                    __getattribute__(config_item['relation']['id'])
                new_relation_item_id = relation_items[config_item['data-property']]['id']
                if current_relation_item_id != new_relation_item_id:
                    setattr(item_db, config_item['data-property'],
                            relation_items[config_item['data-property']]['item'])
            elif 'id' in config_item and config_item['id'] == True:
                pass
            else:
                setattr(item_db, config_item['data-property'], self.request.json[config_item['grid-property']])

        transaction.commit()

        return self._get_item(reference_book_type, dgrid_viewmodel, item_id)

    def _get_query_item_joinedload(self, reference_book_type, dgrid_viewmodel, item_id, session):
        session_close = False
        if not session:
            session = DBSession()
            session_close = True
        item_query = session.query(reference_book_type)
        item_query = item_query.filter_by(id=item_id)

        rel_attrs = filter(lambda c: 'relation' in c, dgrid_viewmodel)
        for rel_attr in rel_attrs:
            relation_field = rel_attr['relation']['relation-field']
            item_query = item_query.outerjoin(relation_field).options(joinedload(relation_field))

        if session_close:
            session.close()

        return item_query

    def _build_item_for_response(self, dgrid_viewmodel, item_db):
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
        return result_item
