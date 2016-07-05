# coding=utf-8

from __future__ import print_function

import os
import transaction
from sqlalchemy import Table

from nextgisweb import DBSession
from nextgisweb_compulink.compulink_admin.model import Region
from nextgisweb_compulink.db_migrations.common import StructUpdater
from nextgisweb.resource import Base



def add_federal_dist_id_field(args):

    try:
        db_session = DBSession()
        transaction.manager.begin()

        eng = db_session.get_bind()
        meta_data = Base.metadata
        real_table = Table(Region.__table__.name, meta_data, schema=Region.__table_args__['schema'], autoload=True, autoload_with=eng)

        if not Region.federal_dist_id.key in real_table.columns:
            StructUpdater.create_column(real_table, Region.federal_dist_id.key, Region.federal_dist_id.type)

            # it's super cool... SQL Migration!
            eng.execute('''ALTER TABLE compulink.region
                         ADD CONSTRAINT region_federal_dist_id_fkey FOREIGN KEY (federal_dist_id)
                         REFERENCES compulink.federal_district (id) MATCH SIMPLE
                         ON UPDATE NO ACTION ON DELETE NO ACTION;
                        ''')
        transaction.manager.commit()
        db_session.close()

        print ('Federal district id column added for ' + real_table.name)

    except Exception as ex:
        print('Error on adding field to Region table: %s' % (ex.message))
