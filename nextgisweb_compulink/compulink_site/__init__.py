# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from nextgisweb import Base

from nextgisweb.component import Component

from .ident import COMP_ID
from .view import get_all_dicts


@Component.registry.register
class CompulinkSiteComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        super(CompulinkSiteComponent, self).initialize()

    def setup_pyramid(self, config):
        super(CompulinkSiteComponent, self).setup_pyramid(config)

        from . import view
        view.setup_pyramid(self, config)

    settings_info = (
    )

    def client_settings(self, request):
        return dict(
            dicts=get_all_dicts()
        )
