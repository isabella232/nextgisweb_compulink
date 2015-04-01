# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os.path

from nextgisweb.component import Component

from .model import Base, PROJECT_STATUS_PROJECT
from nextgisweb_compulink.compulink_admin.ident import COMP_ID
from nextgisweb_compulink.compulink_admin.view import get_regions_from_resource, get_districts_from_resource, \
    get_project_statuses


@Component.registry.register
class CompulinkAdminComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        pass

    def initialize_db(self):
        pass

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(
            regions_dict=get_regions_from_resource(),
            districts_dict=get_districts_from_resource(),
            statuses_dict=get_project_statuses(),
            def_status=PROJECT_STATUS_PROJECT
        )

    settings_info = (
        dict(key='regions_resouce_id', desc=u'Идентификатор ресурса, хранящего административные границы регионов'),
        dict(key='districts_resouce_id', desc=u'Идентификатор ресурса, хранящего административные границы районов'),
    )
