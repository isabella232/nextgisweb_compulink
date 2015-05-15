# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from os import path

from nextgisweb.component import Component, require
from .model import Base, PROJECT_STATUS_PROJECT
from .ident import COMP_ID
from nextgisweb_compulink.init_data.command import DBInit
from .view import get_regions_from_resource, get_districts_from_resource, get_project_statuses

BASE_PATH = path.abspath(path.dirname(__file__))

@Component.registry.register
class CompulinkAdminComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    @require('lookup_table')
    def initialize(self):
        pass

    @require('lookup_table')
    def initialize_db(self):
        #TODO: fake! Need refactoring
        args = self
        args.action = 'all'
        args.force = False

        DBInit.execute(args, make_transaction=False)

    @require('lookup_table')
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
