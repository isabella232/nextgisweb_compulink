# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from sqlalchemy import and_
from nextgisweb import DBSession
from nextgisweb.resource import Widget, Resource
from nextgisweb import dynmenu as dm
from reference_books import routes as reference_books_routes
from .model import FoclProject, FoclStruct, SituationPlan, PROJECT_STATUS_PROJECT, \
    PROJECT_STATUS_IN_PROGRESS, PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED, Region, District


class FoclProjectWidget(Widget):
    resource = FoclProject
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/FoclProjectWidget'


class FoclStructWidget(Widget):
    resource = FoclStruct
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/FoclStructWidget'


class SituationPlanWidget(Widget):
    resource = SituationPlan
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/SituationPlanWidget'


def setup_pyramid(comp, config):
    # Регистрируем секцую Проект строительства ВОЛС в Групповом ресурсе
    Resource.__psection__.register(
        key='focl_project', priority=10,
        is_applicable=lambda obj: isinstance(obj, FoclProject),
        template='nextgisweb_compulink:compulink_admin/template/focl_project_section.mako')

    # menu in admin
    class CompulinkAdminMenu(dm.DynItem):
        def build(self, kwargs):
            yield dm.Link(
                self.sub('region_dict'), u'Справочник федеральных округов',
                lambda kwargs: kwargs.request.route_url('compulink_admin.reference_books.get_page',
                                                        reference_book_type='federal_district')
            )
            yield dm.Link(
                self.sub('region_dict'), u'Справочник регионов',
                lambda kwargs: kwargs.request.route_url('compulink_admin.reference_books.get_page',
                                                        reference_book_type='region')
            )
            yield dm.Link(
                self.sub('district_dict'), u'Справочник районов',
                lambda kwargs: kwargs.request.route_url('compulink_admin.reference_books.get_page',
                                                        reference_book_type='district')
            )
            yield dm.Link(
                self.sub('project_dict'), u'Справочник проектов',
                lambda kwargs: kwargs.request.route_url('compulink_admin.reference_books.get_page',
                                                        reference_book_type='project')
            )
            yield dm.Link(
                self.sub('const_obj_dict'), u'Справочник объектов строительства',
                lambda kwargs: kwargs.request.route_url('compulink_admin.reference_books.get_page',
                                                        reference_book_type='construct_object')
            )

    CompulinkAdminMenu.__dynmenu__ = comp.env.pyramid.control_panel

    comp.env.pyramid.control_panel.add(
        dm.Label('compulink_admin', u'Компьюлинк. Администрирование'),
        CompulinkAdminMenu('compulink_admin'),
    )

    reference_books_routes.initialize(config)


# todo: NEED BIG REFACTORING!!!!
def get_regions_from_resource(as_dict=False, sort=False):
    session = DBSession()
    regions = session.query(Region).all()

    features = [{'name': reg.name, 'id': reg.id} for reg in regions]

    if sort:
        features.sort(key=lambda x: x['name'])
    if as_dict:
        return {feat['id']: feat['name'] for feat in features}
    return features


def get_region_name(reg_id):
    if not reg_id:
        return ''

    session = DBSession()

    # receive value
    try:
        region = session.query(Region).filter(Region.id == reg_id).one()
        return region.name if region else None
    except:
        return None


def get_region_id(reg_short_name):
    if not reg_short_name:
        return None

    session = DBSession()

    # receive values
    try:
        region = session.query(Region).filter(Region.short_name == reg_short_name).one()
        return region.id if region else None
    except:
        return None


def get_districts_from_resource(as_dict=False, sort=False):
    session = DBSession()
    districts = session.query(District).all()
    features = [{'name': dist.name, 'id': dist.id, 'parent_id': dist.region_id} for dist in districts]

    if sort:
        features.sort(key=lambda x: x['name'])
    if as_dict:
        return {feat['id']: feat['name'] for feat in features}

    return features


def get_district_name(distr_id):
    if not distr_id:
        return ''

    session = DBSession()

    # receive value
    try:
        dist = session.query(District).filter(District.id == distr_id).one()
        return dist.name if dist else None
    except:
        return None


def get_district_id(distr_short_name, parent_id):
    if not distr_short_name:
        return None

    session = DBSession()

    # receive values
    try:
        dist = session.query(District).filter(
            and_(District.short_name == distr_short_name, District.region_id == parent_id)).one()
        return dist.id if dist else None
    except:
        return None


def get_project_statuses(as_dict=False):
    statuses = [
        {'name': 'Строительство не начато', 'id': PROJECT_STATUS_PROJECT},
        {'name': 'Идет строительство', 'id': PROJECT_STATUS_IN_PROGRESS},
        {'name': 'Построено', 'id': PROJECT_STATUS_BUILT},
        {'name': 'Сдано заказчику', 'id': PROJECT_STATUS_DELIVERED},
    ]

    if as_dict:
        return {status['id']: status['name'] for status in statuses}
    else:
        return statuses
