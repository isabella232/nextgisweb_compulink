# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from nextgisweb import Base
from nextgisweb.component import Component
from ident import COMP_ID
from .view import setup_events


class CompulinkInternalMirroringComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        super(CompulinkInternalMirroringComponent, self).initialize()
        setup_events()

    def setup_pyramid(self, config):
        pass

    settings_info = ()
