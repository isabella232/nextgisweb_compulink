# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from sqlalchemy import and_, func
from nextgisweb import DBSession
from nextgisweb.resource import Widget, Resource
from nextgisweb import dynmenu as dm
from nextgisweb.pyramid import viewargs

from ..dgrid_viewmodels import *
from pyramid.response import Response
from nextgisweb_compulink.compulink_admin.model import Region
import re
import json
import transaction


@viewargs(renderer='nextgisweb_compulink:compulink_admin/reference_books/templates/regions.mako')
def get_region_page(request):
    dgrid_columns_config = []
    regions = []
    for field_config_item in regions_dgrid_viewmodel:
        dgrid_column_config = {
            'label': field_config_item['label'],
            'field': field_config_item['grid-property']
        }
        dgrid_column_config.update(field_config_item['cell-prop'])
        dgrid_columns_config.append(dgrid_column_config)

    return {
        'title': u'Справочник регионов',
        'columnsSettings': dgrid_columns_config,
        'dynmenu': request.env.pyramid.control_panel
    }


@viewargs(renderer='nextgisweb_compulink:compulink_admin/reference_books/templates/districts.mako')
def get_district_page(request):
    columns_settings = []
    for config_item in districts_dgrid_viewmodel:
        grid_config_store_item = {
            'label': config_item['label'],
            'field': config_item['grid-property']
        }
        grid_config_store_item.update(config_item['cell-prop'])
        columns_settings.append(grid_config_store_item)

    return {
        'title': u'Справочник районов',
        'columnsSettings': columns_settings,
        'dynmenu': request.env.pyramid.control_panel
    }


@viewargs(renderer='nextgisweb_compulink:compulink_admin/reference_books/templates/projects.mako')
def get_project_page(request):
    return {
        'title': u'Справочник проектов'
    }


@viewargs(renderer='nextgisweb_compulink:compulink_admin/reference_books/templates/construct_objects.mako')
def get_construct_object_page(request):
    return {
        'title': u'Справочник объектов строительства'
    }