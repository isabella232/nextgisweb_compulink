# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import re

from nextgisweb.pyramid import viewargs
from pyramid.response import Response
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from nextgisweb_compulink.compulink_admin.model import *
from ..dgrid_viewmodels import *
from pyramid.view import (
    view_config,
    view_defaults
    )
from ReferenceBookViewBase import ReferenceBookViewBase


@view_defaults()
class ReferenceBooksView(ReferenceBookViewBase):
    def __init__(self, request):
        super(ReferenceBooksView, self).__init__(request)

    @property
    def mapper_dict(self):
        return {
            'region': (Region, regions_dgrid_viewmodel,
                       'nextgisweb_compulink:compulink_admin/reference_books/templates/region.mako'),
            'district': (District, districts_dgrid_viewmodel,
                       'nextgisweb_compulink:compulink_admin/reference_books/templates/districts.mako'),
            'project': (Project, regions_dgrid_viewmodel,
                       'nextgisweb_compulink:compulink_admin/reference_books/templates/projects.mako'),
            'construct_object': (ConstructObject, districts_dgrid_viewmodel,
                       'nextgisweb_compulink:compulink_admin/reference_books/templates/construct_objects.mako')
        }

    def get_domain_type(self, reference_book_domain_route):
        return self.mapper_dict[reference_book_domain_route]

    @view_config(route_name='compulink_admin.reference_books.get_page', renderer='json')
    def get_page_by_type(self):
        reference_book_domain_route = self.request.matchdict['reference_book_type']
        reference_book_type, dgrid_viewmodel, template = self.get_domain_type(reference_book_domain_route)
        return self._get_page(dgrid_viewmodel, template)

    @view_config(route_name='compulink_admin.services.reference_books.get_items', renderer='json')
    def get_items_by_type(self):
        reference_book_domain_route = self.request.matchdict['reference_book_type']
        reference_book_type, dgrid_viewmodel, template = self.get_domain_type(reference_book_domain_route)
        return self._get_items(reference_book_type, dgrid_viewmodel)
