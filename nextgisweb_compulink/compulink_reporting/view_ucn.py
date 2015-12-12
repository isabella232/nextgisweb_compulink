# coding=utf-8
import json
from datetime import date
from random import randint

from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response
from sqlalchemy import func
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession
from nextgisweb.pyramid import viewargs
from nextgisweb_compulink.compulink_admin.model import ConstructObject, Project
from nextgisweb_compulink.compulink_reporting.common import UCN_GROUP_NAME, UCN_PROJECT_KEYNAME
from .model import RtMacroDivision


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



def ucn_group_verify(f):
    def wrapper(*args, **kw):
        request = args[0]
        groups = request.user.member_of
        if len(filter(lambda group: group.keyname == UCN_GROUP_NAME, groups)) < 1:
            raise HTTPForbidden()
        else:
            return f(*args, **kw)

    return wrapper


@viewargs(renderer='nextgisweb_compulink:compulink_reporting/template/ucn.mako')
@ucn_group_verify
def get_reports_ucn(request):
    user = request.user
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
        'state': {'opened': True, 'selected': True},
        'children': []
    }

    result.append(root_el)

    #get macro regions
    db_session = DBSession()

    macros = db_session.query(RtMacroDivision).options(joinedload_all(RtMacroDivision.branches)).all()

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
    # get min max from db
    db_session = DBSession()
    ucn_proj = db_session.query(Project).filter(Project.keyname==UCN_PROJECT_KEYNAME).one()

    min_start_date = db_session.query(func.min(ConstructObject.start_build_date)).filter(ConstructObject.project == ucn_proj).scalar()
    max_end_date = db_session.query(func.max(ConstructObject.end_build_date)).filter(ConstructObject.project == ucn_proj).scalar()

    # if null, set def values
    min_start_year = min_start_date.year if min_start_date else 2015
    max_end_year = max_end_date.year if max_end_date else 2020

    # check min max
    if min_start_year > max_end_year:
        min_start_year, max_end_year = max_end_year, min_start_year

    # create range
    years = list(range(min_start_year, max_end_year+1))

    # current and selected years
    current_year = date.today().year
    selected_year = current_year if current_year in years else years[0]

    years_view_model = [{'year': x, 'selected': x == selected_year} for x in years]
    return years_view_model


@viewargs(renderer='json')
@ucn_group_verify
def get_charts_data(request):
    division = request.POST['division']
    years = request.POST['years']

    # plan td


    return Response(json.dumps({
        'dynamics': {
            'labels': [r for r in xrange(365)],
            'Vols': {
                'plan': [randint(0, 1000) for r in xrange(365)],
                'fact': [randint(0, 1000) for r in xrange(365)]
            },
            'Td': {
                'plan': [randint(0, 1000) for r in xrange(365)],
                'fact': [randint(0, 1000) for r in xrange(365)]
            }
        },
        'plan': {
            'labels': [u'Дальний Восток', u'Сибирь', u'Урал', u'Волга', u'Юг', u'Северо-Запад'],
            'Vols': {
                'plan': [randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000)],
                'fact': [randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000)]
            },
            'Td': {
                'plan': [randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000)],
                'fact': [randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000), randint(0, 2000)]
            }
        }
    }))
