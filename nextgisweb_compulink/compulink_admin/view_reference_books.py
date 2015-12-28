# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from sqlalchemy import and_
from nextgisweb import DBSession
from nextgisweb.resource import Widget, Resource
from nextgisweb import dynmenu as dm
from nextgisweb.pyramid import viewargs
from .model import FoclProject, FoclStruct, SituationPlan, PROJECT_STATUS_PROJECT, \
    PROJECT_STATUS_IN_PROGRESS, PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED, Region, District


def add_routes(config):
    config.add_route(
        'compulink_admin.reference_books.region',
        '/compulink/admin/reference_books/region').add_view(get_region_page)
    config.add_route(
        'compulink_admin.reference_books.district',
        '/compulink/admin/reference_books/district').add_view(get_district_page)
    config.add_route(
        'compulink_admin.reference_books.project',
        '/compulink/admin/reference_books/project').add_view(get_project_page)
    config.add_route(
        'compulink_admin.reference_books.construct_object',
        '/compulink/admin/reference_books/construct_object').add_view(get_construct_object_page)


@viewargs(renderer='nextgisweb_compulink:compulink_admin/template/reference_books/regions.mako')
def get_region_page(request):
    return {
        'title': u'Справочник регионов'
    }


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
