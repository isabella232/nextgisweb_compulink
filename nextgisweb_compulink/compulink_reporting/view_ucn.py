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
from .model import ConstructionStatusReport, RtMacroDivision
from nextgisweb.pyramid import viewargs
from pyramid.view import view_config
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

    config.add_route(
        'compulink.reports.ucn.chart',
        '/compulink/reports/ucn/chart',
        client=()) \
        .add_view(get_charts_data)


@viewargs(renderer='nextgisweb_compulink:compulink_reporting/template/ucn.mako')
def get_reports_ucn(request):
    return {
        'years': _get_years(),
        'divisions': _get_divisions()
    }


def _get_divisions():
    # todo: change the stub to real data set from database
    result = []

    #root element
    root_el = {
        'id': 'root',
        'text': u'Все МРФ',
        'state': {'opened': True},
        'children': []
    }

    result.append(root_el)

    #get macro regions
    db_session = DBSession()

    macros = db_session.query(RtMacroDivision).all()

    for macro in macros:
        macro_el = {
            'id': 'm.%s' % macro.id,
            'text': macro.name,
            'children': []
        }
        root_el['children'].append(macro_el)

        # get filials
        for branch in macro.branches:
            branch_el = {
                'id': 'b.%s' % branch.id,
                'text': branch.name,
                'children': False
            }
            macro_el['children'].append(branch_el)

    return result


def _get_years():
    return [2015, 2016, 2017, 2018]


@view_config(renderer='json')
def get_charts_data(request):
    division = request.POST['division']
    years = request.POST['years']

    return Response(json.dumps({
        'dynamics': {
            'labels': [u'Февраль', u'Март', u'Апрель', u'Май', u'Июнь', u'Июль'],
            'Vols': {
                'plan': [5000, 8000, 15000, 17000, 19000, 19500],
                'fact': [5000, 8100, 16100, 18000, 19800, 22000]
            },
            'Td': {
                'plan': [5000, 8000, 15000, 17000, 19000, 19500],
                'fact': [5000, 8100, 16100, 18000, 19800, 22000]
            }
        },
        'plan': {
            'labels': [u'Дальний Восток', u'Сибирь', u'Урал', u'Волга', u'Юг', u'Северо-Запад'],
            'Vols': {
                'plan': [5000, 8000, 15000, 17000, 19000, 19500],
                'fact': [5000, 8100, 16100, 18000, 19800, 22000]
            },
            'Td': {
                'plan': [5000, 8000, 15000, 17000, 19000, 19500],
                'fact': [5000, 8100, 16100, 18000, 19800, 22000]
            }
        }
    }))
