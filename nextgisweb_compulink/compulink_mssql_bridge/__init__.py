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


class CompulinkMssqlBridgeComponent(Component):
    identity = COMP_ID
    #metadata = Base.metadata

    def initialize(self):
        super(CompulinkMssqlBridgeComponent, self).initialize()

    def setup_pyramid(self, config):

        enabled_sett = self._settings.get('enable', 'false').lower()
        self.enabled = enabled_sett in ('true', 'yes', '1')

        if self.enabled:
            conn_str = self._settings.get('conn_str', 'no')
            CompulinkMssqlBridgeComponent.configure_db_conn(conn_str)

        self.DBSession = DBSession
        self.Base = Base

        from . import view
        view.setup_pyramid(self, config)

    @classmethod
    def configure_db_conn(cls, conn_str):
        cls.engine = create_engine(conn_str)

        DBSession.configure(bind=cls.engine)
        Base.metadata.bind = cls.engine


    settings_info = (
        dict(key='conn_str', desc=u"Строка соединения с MS SQL Server"),
        dict(key='enable', desc=u"Включить интеграцию с MS SQL Server"),
    )
