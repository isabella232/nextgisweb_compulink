# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from zope.sqlalchemy import ZopeTransactionExtension


from nextgisweb.component import Component
from ident import COMP_ID

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))
Base = declarative_base()

@Component.registry.register
class CompulinkDataReactorComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize(self):
        super(CompulinkDataReactorComponent, self).initialize()

    def setup_pyramid(self, config):
        super(CompulinkDataReactorComponent, self).setup_pyramid(config)
        from . import view
        view.setup_pyramid(self, config)

    settings_info = (
        #dict(key='conn_str', desc=u"Строка соединения с MS SQL Server"),
        #dict(key='enable', desc=u"Включить интеграцию с MS SQL Server"),
    )
