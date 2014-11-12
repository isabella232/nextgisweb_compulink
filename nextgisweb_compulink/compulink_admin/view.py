# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os.path

from pyramid.response import FileResponse
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.resource import Resource, Widget, resource_factory, DataScope, ResourceGroup
from nextgisweb.env import env
from .model import FoclProject


class FoclProjectWidget(Widget):
    resource = FoclProject  # ResourceGroup
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/FoclProjectWidget'


def setup_pyramid(comp, config):
    #Регистрируем секцую Проект строительства ВОЛС в Групповом ресурсе
    Resource.__psection__.register(
       key='focl_project', priority=20, title="Проект строительства ВОЛС",
       is_applicable=lambda obj: isinstance(obj, FoclProject),
       template='nextgisweb_compulink:compulink_admin/template/focl_project_section.mako')
