# coding=utf-8
import json
import tempfile
from datetime import datetime
from openpyxl import load_workbook
from openpyxl.styles import Style
from openpyxl.styles.numbers import FORMAT_PERCENTAGE
from os import path
from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response, FileResponse
from sqlalchemy import func
from nextgisweb import DBSession
from sqlalchemy.orm import joinedload_all
from .model import ConstructionStatusReport
from nextgisweb.pyramid import viewargs
from nextgisweb.resource import DataScope, ResourceGroup
from nextgisweb.resource.model import ResourceACLRule
from nextgisweb_compulink.compulink_admin import get_regions_from_resource, get_districts_from_resource, \
    get_project_statuses
from nextgisweb_compulink.compulink_admin.model import FoclProject, FoclStruct, PROJECT_STATUS_DELIVERED
from nextgisweb_compulink.compulink_admin.view import get_region_name, get_district_name
from nextgisweb_compulink.compulink_reporting.utils import DateTimeJSONEncoder


def add_routes(config):
    config.add_route(
        'compulink.reports.ucn',
        '/compulink/reports/ucn',
        client=()) \
        .add_view(get_reports_ucn)


@viewargs(renderer='nextgisweb_compulink:compulink_reporting/template/ucn.mako')
def get_reports_ucn(request):
    return {
        'years': _get_years(),
        'divisions': _get_divisions()
    }


def _get_divisions():
    # todo: change the stub to real data set from database
    return [
        {
            'id': 1,
            'text': u'Все МРФ',
            'state': {'opened': True},
            'children': [
                {
                    'id': 2,
                    'text': u'Центр',
                    'children': [
                        {
                            'id': 3,
                            'text': u'Владимирская область',
                            'children': False
                        },
                        {
                            'id': 4,
                            'text': u'Воронежская область',
                            'children': False
                        }
                    ]
                },
                {
                    'id': 5,
                    'text': u'Волга',
                    'children': [
                        {
                            'id': 6,
                            'text': u'Владимирская область',
                            'children': False
                        },
                        {
                            'id': 7,
                            'text': u'Воронежская область',
                            'children': False
                        }
                    ]
                },
                {
                    'id': 8,
                    'text': u'Юг',
                    'children': [
                        {
                            'id': 9,
                            'text': u'Владимирская область',
                            'children': False
                        },
                        {
                            'id': 10,
                            'text': u'Воронежская область',
                            'children': False
                        }
                    ]
                }
            ]
        }
    ]


def _get_years():
    return [2015, 2016, 2017, 2018]
