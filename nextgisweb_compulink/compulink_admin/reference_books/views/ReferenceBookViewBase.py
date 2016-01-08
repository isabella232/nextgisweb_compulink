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
