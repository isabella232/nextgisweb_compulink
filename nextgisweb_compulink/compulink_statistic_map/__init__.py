# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from nextgisweb import Base

from nextgisweb.component import Component
from .ident import COMP_ID



class CompulinkStatisticMapComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        super(CompulinkStatisticMapComponent, self).initialize()

    def setup_pyramid(self, config):
        super(CompulinkStatisticMapComponent, self).setup_pyramid(config)

        from . import view
        view.setup_pyramid(self, config)

    settings_info = (
    )

    def client_settings(self, request):
        return dict()
