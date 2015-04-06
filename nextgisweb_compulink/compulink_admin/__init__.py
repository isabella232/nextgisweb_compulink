# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from os import path
from sqlalchemy.orm.exc import NoResultFound
from nextgisweb.auth import User
from nextgisweb.auth import Group
from nextgisweb.env import env

from nextgisweb.component import Component

from .model import Base, PROJECT_STATUS_PROJECT
from .ident import COMP_ID
from nextgisweb.resource import ResourceGroup, ACLRule
from .view import get_regions_from_resource, get_districts_from_resource, get_project_statuses

BASE_PATH = path.abspath(path.dirname(__file__))

@Component.registry.register
class CompulinkAdminComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        pass

    def initialize_db(self):
        #create group
        adminusr = User.filter_by(keyname='administrator').one()
        admingrp = Group.filter_by(keyname='administrators').one()
        everyone = User.filter_by(keyname='everyone').one()

        try:
            ResourceGroup.filter_by(keyname='dictionary_group').one()

        except NoResultFound:
            obj0 = ResourceGroup.filter_by(id=0).one()
            obj = ResourceGroup(owner_user=adminusr,
                                display_name='Справочники',
                                keyname='dictionary_group',
                                parent=obj0
                                )

            obj.acl.append(ACLRule(
                principal=admingrp,
                action='allow'))

            obj.acl.append(ACLRule(
                principal=everyone,
                scope='resource',
                permission='delete',
                action='deny',
                propagate=False))

            obj.persist()


        #load data
        #todo

        #load icons
        env.marker_library.load_collection('nextgisweb_compulink', 'compulink_admin/layers_default_styles')


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
