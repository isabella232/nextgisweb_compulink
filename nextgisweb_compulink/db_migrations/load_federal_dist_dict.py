# coding=utf-8

from __future__ import print_function

import os
import transaction
from sqlalchemy import Table

from nextgisweb import DBSession
from nextgisweb_compulink.compulink_admin.model import Region
from nextgisweb_compulink.db_migrations.common import StructUpdater
from nextgisweb.resource import Base
from nextgisweb_compulink.init_data.command import DBInit


def load_federal_dist_dict(args):
    DBInit.load_domain_dicts(region=False, district=False)