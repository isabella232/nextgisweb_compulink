# coding=utf-8
import json
from datetime import date
from random import randint

from dateutil import relativedelta
from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response
from sqlalchemy import func, and_, extract
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession
from nextgisweb.pyramid import viewargs
from nextgisweb_compulink.compulink_admin.model import ConstructObject, Project, District
from nextgisweb_compulink.compulink_reporting.common import UCN_GROUP_NAME, UCN_PROJECT_KEYNAME
from .model import RtMacroDivision, RtBranch, RtBranchRegion, BuiltAccessPoint, BuiltCable, Calendar


class DIVISION_TYPE:
    ROOT = 'root'
    MRF = 'mrf'
    BRANCH = 'branch'

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
        'id': '%s.%s' % (DIVISION_TYPE.ROOT, None),
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
            'id': '%s.%s' % (DIVISION_TYPE.MRF, macro.id),
            'text': macro.name,
            'children': []
        }
        root_el['children'].append(macro_el)

        # get filials
        for branch in macro.branches:
            branch_el = {
                'id': '%s.%s' % (DIVISION_TYPE.BRANCH, branch.id),
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

    # get params
    years = [int(y) for y in json.loads(years)]
    division_type, division_id = division.split('.')

    # base subqueries
    db_session = DBSession()
    ucn_proj = db_session.query(Project).filter(Project.keyname == UCN_PROJECT_KEYNAME).one()

    suitable_constr_obj = db_session.query(ConstructObject.resource_id)\
        .filter(ConstructObject.project == ucn_proj, (extract('year', ConstructObject.end_build_date).in_(years)))\
        .subquery('suit_co')

    if division_type == DIVISION_TYPE.ROOT:
        # элементы агригации - МРФ (все)
        aggr_elements = db_session.query(RtMacroDivision).all()
        # ограничения на выборку по ресурсам нет
        aggr_filter = db_session.query(ConstructObject.resource_id).subquery()
    elif division_type == DIVISION_TYPE.MRF:
        # элементы агригации - Подразделения для заданного МРФ
        aggr_elements = db_session.query(RtBranch).filter(RtBranch.macro_division_id == division_id).all()
        # ограничение на выборку по ресурсам - все объекты строительства у которых регион с списке регионов заданного МРФ
        _rt_macro_filter = db_session.query(RtBranch.id).filter(RtBranch.macro_division_id == division_id).subquery()
        _rt_reg_filter = db_session.query(RtBranchRegion.region_id).filter(RtBranchRegion.rt_branch_id.in_(_rt_macro_filter)).subquery()
        aggr_filter = db_session.query(ConstructObject.resource_id).filter(ConstructObject.region_id.in_(_rt_reg_filter)).subquery()
    else:
        # элементы агригации - Районы всех регионов, входящих в заданное подразделение
        _rt_reg_filter = db_session.query(RtBranchRegion.region_id).filter(RtBranchRegion.rt_branch_id == division_id).subquery()
        aggr_elements = db_session.query(District).filter(District.region_id.in_(_rt_reg_filter)).all()
        # ограничение на выборку по ресурсам - все объекты строительства у которых район в списке районов всех регионов, входящих в заданное подразделение
        _dist_filter = db_session.query(District.id).filter(District.region_id.in_(_rt_reg_filter)).subquery()
        aggr_filter = db_session.query(ConstructObject.resource_id).filter(ConstructObject.district_id.in_(_dist_filter)).subquery()

    # dynamic charts
    res_dyn = _get_dynamic_values(years, suitable_constr_obj, aggr_filter)

    # execution charts
    res = _get_execution_values(division_type, aggr_elements, suitable_constr_obj, aggr_filter)
    exec_labels = []
    ap_plan = []
    ap_fact = []
    focl_plan = []
    focl_fact = []
    for k, (ap_p, ap_f, focl_p, focl_f) in res.iteritems():
        exec_labels.append(k)
        ap_plan.append(ap_p or 0)
        ap_fact.append(ap_f or 0)
        focl_plan.append(focl_p or 0)
        focl_fact.append(focl_f or 0)

    dynamic_labels = []
    j = 0
    for i, label in enumerate(res_dyn['label']):
        if label:
            dynamic_labels.append({'value': 31 * j, 'text': label})
            j += 1

    plan_labels = []
    for i, label in enumerate(exec_labels):
        plan_labels.append({'value': i + 1, 'text': label})


    #return
    return Response(json.dumps({
        'dynamics': {
            'labels': dynamic_labels,
            'Vols': {
                'plan': res_dyn['cable_plan'],
                'fact': res_dyn['cable_fact']
            },
            'Td': {
                'plan': res_dyn['ap_plan'],
                'fact': res_dyn['ap_fact']
            }
        },
        'plan': {
            'labels': plan_labels,
            'Vols': {
                'plan': focl_plan,
                'fact': focl_fact
            },
            'Td': {
                'plan': ap_plan,
                'fact': ap_fact
            }
        }
    }))


def _get_execution_values(division_type, aggr_elements, suit_filter, aggr_filter):
    db_session = DBSession()

    today = date.today()
    res = {}

    for aggr_el in aggr_elements:
        if division_type == DIVISION_TYPE.ROOT:
            _rt_macro_filter = db_session.query(RtBranch.id).filter(RtBranch.rt_macro_division == aggr_el).subquery()
            _rt_reg_filter = db_session.query(RtBranchRegion.region_id).filter(RtBranchRegion.rt_branch_id.in_(_rt_macro_filter)).subquery()
            el_filter = db_session.query(ConstructObject.resource_id).filter(ConstructObject.region_id.in_(_rt_reg_filter)).subquery()
        elif division_type == DIVISION_TYPE.MRF:
            _rt_reg_filter = db_session.query(RtBranchRegion.region_id).filter(RtBranchRegion.rt_branch == aggr_el).subquery()
            _dist_filter = db_session.query(District.id).filter(District.region_id.in_(_rt_reg_filter)).subquery()
            el_filter = db_session.query(ConstructObject.resource_id).filter(ConstructObject.district_id.in_(_dist_filter)).subquery()
        else:
            el_filter = db_session.query(ConstructObject.resource_id).filter(ConstructObject.district == aggr_el).subquery()

        #TODO: можно немного ускорить, если отказаться от aggr_filter. По сути он лишний, так как есть el_filter
        # выбираем все ТД по плану для ОС у которых дата сдачи меньше чем сегодня
        ap_plan_val = db_session.query(func.sum(ConstructObject.access_point_plan))\
            .filter(
                ConstructObject.resource_id.in_(suit_filter),
                ConstructObject.resource_id.in_(aggr_filter),
                ConstructObject.resource_id.in_(el_filter),
                ConstructObject.end_build_date <= today
            ).scalar()

        # выбираем все ТД построенные на текущий момент для заданных ресурсов и заданного элемента
        ap_fact_val = db_session.query(func.sum(BuiltAccessPoint.access_point_count))\
            .filter(
                BuiltAccessPoint.resource_id.in_(suit_filter),
                BuiltAccessPoint.resource_id.in_(aggr_filter),
                BuiltAccessPoint.resource_id.in_(el_filter),
            ).scalar()

        # выбираем все ОС для заданного эелемента
        el_objs = db_session.query(ConstructObject)\
            .filter(
                ConstructObject.resource_id.in_(suit_filter),
                ConstructObject.resource_id.in_(aggr_filter),
                ConstructObject.resource_id.in_(el_filter)
            ).all()
        focl_plan_val = 0
        for const_obj in el_objs:
            #план = Общая плановая протяженность ВОЛС / (Плановая дата окончания СМР – Плановая дата начала СМР) * (Текущая дата - Плановая дата начала СМР)
            total_plan_length = const_obj.cabling_plan
            start_date = const_obj.start_build_date
            end_date = const_obj.end_build_date

            if total_plan_length and start_date and end_date and (end_date-start_date).days != 0:
                base_date = today if today < end_date else end_date
                obj_plan_val = total_plan_length * (float((base_date - start_date).days) / (end_date - start_date).days)
                focl_plan_val += obj_plan_val

        # выбираем все длины построенные на текущий момент для заданных ресурсов и заданного элемента
        focl_fact_val = db_session.query(func.sum(BuiltCable.cable_length))\
            .filter(
                BuiltCable.resource_id.in_(suit_filter),
                BuiltCable.resource_id.in_(aggr_filter),
                BuiltCable.resource_id.in_(el_filter),
            ).scalar()
        focl_fact_val = focl_fact_val/1000 if focl_fact_val else 0


        res[aggr_el.name] = (ap_plan_val, ap_fact_val, focl_plan_val, focl_fact_val)
    return res


def _get_dynamic_values(years, suit_filter, aggr_filter):
    db_session = DBSession()

    # date stuff
    today = date.today()
    start_date = date(year=years[0], month=1, day=1)
    end_date = date(year=years[-1], month=12, day=31)
    one_day_delta = relativedelta.relativedelta(days=+1)
    active_date = start_date

    # get data
    calendar_subquery = db_session.query(Calendar.id)\
        .filter(Calendar.year_number>=years[0], Calendar.year_number<=years[-1]).subquery()

    ap_data = db_session.query(Calendar.full_date, func.sum(BuiltAccessPoint.access_point_count)).filter(
        BuiltAccessPoint.resource_id.in_(suit_filter),
        BuiltAccessPoint.resource_id.in_(aggr_filter),
        BuiltAccessPoint.build_date_id.in_(calendar_subquery)
    ).join(BuiltAccessPoint.build_date)\
     .group_by(Calendar.full_date)\
     .order_by(Calendar.full_date).all()

    cable_data = db_session.query(Calendar.full_date, func.sum(BuiltCable.cable_length)).filter(
        BuiltCable.resource_id.in_(suit_filter),
        BuiltCable.resource_id.in_(aggr_filter),
        BuiltCable.build_date_id.in_(calendar_subquery)
    ).join(BuiltCable.build_date)\
     .group_by(Calendar.full_date)\
     .order_by(Calendar.full_date).all()

    plan_data = db_session.query(ConstructObject).filter(
        ConstructObject.resource_id.in_(suit_filter),
        ConstructObject.resource_id.in_(aggr_filter),
    ).order_by(ConstructObject.start_build_date).all()

    # counters
    ap_plan_val = 0
    ap_fact_val = 0
    cable_plan_val = 0
    cable_fact_val = 0
    res = {'label': [], 'ap_plan': [], 'ap_fact': [], 'cable_plan': [], 'cable_fact': []}

    while active_date <= end_date:
        # set label
        if active_date.day == 1:
            res['label'].append(active_date.strftime('%d.%m.%Y'))
        else:
            res['label'].append(None)

        # set ap plan
        on_date_built_co = filter(lambda x: x.end_build_date <= active_date, plan_data)
        val = sum([x.access_point_plan for x in on_date_built_co if x.access_point_plan is not None])
        res['ap_plan'].append(val)

        # set ap fact
        if active_date <= today:
            f = filter(lambda x: x[0] == active_date, ap_data)
            if len(f) > 0:
                val = f[0][1]
                ap_fact_val += val
            res['ap_fact'].append(ap_fact_val)
        else:
            res['ap_fact'].append(None)

        # set cable plan
        focl_plan_val = 0
        for const_obj in plan_data:
            total_plan_length = const_obj.cabling_plan
            start_date = const_obj.start_build_date
            end_date = const_obj.end_build_date

            if total_plan_length and start_date and end_date and (end_date-start_date).days != 0 and (active_date >= start_date):
                if active_date > end_date:
                    focl_plan_val += total_plan_length
                else:
                    base_date = active_date if active_date < end_date else end_date
                    obj_plan_val = total_plan_length * (float((base_date - start_date).days) / (end_date - start_date).days)
                    focl_plan_val += obj_plan_val

        res['cable_plan'].append(focl_plan_val)

        # set cable fact
        if active_date <= today:
            f = filter(lambda x: x[0] == active_date, cable_data)
            if len(f) > 0:
                val = f[0][1]/1000.0
                cable_fact_val += val
            res['cable_fact'].append(cable_fact_val)
        else:
            res['cable_fact'].append(None)

        active_date = active_date + one_day_delta

    return res