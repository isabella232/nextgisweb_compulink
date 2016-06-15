# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from .test_data_generator import command  # NOQA
from .style_updater import command  # NOQA
from .db_migrations import command  # NOQA
from .init_data import command  # NOQA
from .real_data_generator import command  # NOQA
from .compulink_data_reactor import command  # NOQA
from .legend_generator import command  # NOQA
from .real_data_importer import command  # NOQA


def pkginfo():
    return dict(
        components=dict(
            compulink_admin='nextgisweb_compulink.compulink_admin',
            compulink_site='nextgisweb_compulink.compulink_site',
            compulink_mobile='nextgisweb_compulink.compulink_mobile',
            compulink_mssql_bridge='nextgisweb_compulink.compulink_mssql_bridge',
            compulink_reporting='nextgisweb_compulink.compulink_reporting',
            compulink_data_reactor='nextgisweb_compulink.compulink_data_reactor',
            compulink_editor='nextgisweb_compulink.compulink_editor',
            compulink_internal_mirroring='nextgisweb_compulink.compulink_internal_mirroring',
            compulink_statistic_map='nextgisweb_compulink.compulink_statistic_map',
            compulink_deviation='nextgisweb_compulink.compulink_deviation',
        )
    )


def amd_packages():
    return (
        ('ngw-compulink-admin', 'nextgisweb_compulink:compulink_admin/amd/ngw-compulink-admin'),
        ('ngw-compulink-site', 'nextgisweb_compulink:compulink_site/amd/ngw-compulink-site'),
        ('ngw-compulink-editor', 'nextgisweb_compulink:compulink_editor/amd/ngw-compulink-editor'),
        ('ngw-compulink-reporting', 'nextgisweb_compulink:compulink_reporting/amd/ngw-compulink-reporting'),
        ('ngw-compulink-libs', 'nextgisweb_compulink:compulink_site/static/js'),
        ('ngw-compulink-statistic-map', 'nextgisweb_compulink:compulink_statistic_map/amd/ngw-compulink-statistic-map'),
        ('ngw-compulink-deviation', 'nextgisweb_compulink:compulink_deviation/amd/ngw-compulink-deviation'),
        ('jquery', 'nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2')
    )
