# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os.path

from nextgisweb.component import Component

from .model import Base
from nextgisweb_compulink.compulink_admin.ident import COMP_ID


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

    settings_info = (
        #dict(key='path', desc=u"Директория для хранения файлов"),
    )
