# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from nextgisweb.resource import Widget, Resource

from .model import FoclProject, FoclStruct, SituationPlan


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
