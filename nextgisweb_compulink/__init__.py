# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from .test_data_generator import command  # NOQA


def pkginfo():
    return dict(
        components=dict(
            compulink_admin='nextgisweb_compulink.compulink_admin',
            compulink_site='nextgisweb_compulink.compulink_site',
        )
    )


def amd_packages():
    return (
        ('ngw-compulink-admin', 'nextgisweb_compulink:compulink_admin/amd/ngw-compulink-admin'),
        ('ngw-compulink-site', 'nextgisweb_compulink:compulink_site/amd/ngw-compulink-site'),
    )
