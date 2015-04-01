# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from nextgisweb.resource import Widget, Resource

from .model import FoclProject, FoclStruct, SituationPlan, PROJECT_STATUS_PROJECT, PROJECT_STATUS_FINISHED, \
    PROJECT_STATUS_IN_PROGRESS


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
    #Регистрируем секцую Проект строительства ВОЛС в Групповом ресурсе
    Resource.__psection__.register(
       key='focl_project', priority=10,
       is_applicable=lambda obj: isinstance(obj, FoclProject),
       template='nextgisweb_compulink:compulink_admin/template/focl_project_section.mako')

def get_regions_from_resource():
    return [
        {'name': 'Адыгея', 'id': 'ad'},
        {'name': 'Алтай', 'id': 'al'},
        {'name': 'Алтайский край', 'id': 'alc'}
    ]
    return []

def get_districts_from_resource():
    return [
        {'name': 'Смолинский', 'id': 'sm', 'parent_id': 'ad'},
        {'name': 'Новинский', 'id': 'nov', 'parent_id': 'ad'},
        {'name': 'Аташевский', 'id': 'ata', 'parent_id': 'al'}
    ]
    return []

def get_project_statuses():
    return [
        {'name': 'Проект', 'id': PROJECT_STATUS_PROJECT},
        {'name': 'Идет строительство', 'id': PROJECT_STATUS_IN_PROGRESS},
        {'name': 'Построен', 'id': PROJECT_STATUS_FINISHED}
    ]
    return []
