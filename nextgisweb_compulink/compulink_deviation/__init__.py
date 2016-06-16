# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from nextgisweb.component import Component
from ident import COMP_ID
from .model import Base


class CompulinkDeviationComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        super(CompulinkDeviationComponent, self).initialize()

    def initialize_db(self):
        pass

    def setup_pyramid(self, config):
        super(CompulinkDeviationComponent, self).setup_pyramid(config)

        from . import view
        view.setup_pyramid(self, config)


    settings_info = (
        dict(key='deviation_distance', desc=u"Отклонение от проекта в метрах", ),
    )
