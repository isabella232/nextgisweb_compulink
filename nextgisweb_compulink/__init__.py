# -*- coding: utf-8 -*-
from __future__ import unicode_literals


def pkginfo():
    return dict(components=dict(compulink_admin="nextgisweb_compulink.compulink_admin"))


def amd_packages():
    return (
        ('ngw-compulink-admin', 'nextgisweb_compulink:compulink_admin/amd/ngw-compulink-admin'),
    )

