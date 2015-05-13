# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from .test_data_generator import command  # NOQA
from .style_updater import command  # NOQA
from .db_migrations import command  # NOQA
from .init_data import command  # NOQA
from .real_data_generator import command  # NOQA


def pkginfo():
    return dict(
        components=dict(
            compulink_admin='nextgisweb_compulink.compulink_admin',
            compulink_site='nextgisweb_compulink.compulink_site',
            compulink_mobile='nextgisweb_compulink.compulink_mobile',

        )
    )


def amd_packages():
    return (
        ('ngw-compulink-admin', 'nextgisweb_compulink:compulink_admin/amd/ngw-compulink-admin'),
        ('ngw-compulink-site', 'nextgisweb_compulink:compulink_site/amd/ngw-compulink-site'),
        ('ngw-compulink-libs', 'nextgisweb_compulink:compulink_site/static/js'),
        ('jquery', 'nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2')
    )
