# coding=utf-8
import json
from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response
from pyramid.view import view_config


from nextgisweb import DBSession
from sqlalchemy.orm import joinedload_all
from .model import ConstructionStatusReport
from nextgisweb.resource import DataScope, ResourceGroup
from nextgisweb.resource.model import ResourceACLRule
from nextgisweb_compulink.compulink_admin.model import FoclStruct, FoclProject


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.reporting.get_status_report',
        '/compulink/reporting/get_status_report').add_view(get_status_report)


@view_config()
def get_status_report(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    # get params
    region_filter = request.params.get('region', None)
    district_filter = request.params.get('district', None)
    overdue_filter = request.params.get('only_overdue', False)
    status_filter = request.params.getall('status')


    report_query = DBSession.query(ConstructionStatusReport)
    if region_filter:
        report_query = report_query.filter(ConstructionStatusReport.region==region_filter)
    if district_filter:
        report_query = report_query.filter(ConstructionStatusReport.district==district_filter)
    if overdue_filter:
        report_query = report_query.filter(ConstructionStatusReport.is_overdue==True)
    if status_filter:
        report_query = report_query.filter(ConstructionStatusReport.status.in_(status_filter))

    if not request.user.is_administrator:
        allowed_res_ids = get_user_writable_focls(request.user)
        report_query = report_query.filter(ConstructionStatusReport.focl_res_id.in_(allowed_res_ids))


    json_report = []
    num_line = 1
    for row in report_query.all():

        # if not request.user.is_administrator:
        #     try:
        #         resource = DBSession.query(FoclStruct).get(row.focl_res_id)
        #     except:
        #         continue    # not found
        #     if not resource.has_permission(DataScope.write, request.user):
        #         continue   # hasn't perm


        json_row = {
            'num_line':         num_line,
            'focl_name':        row.focl_name,
            'region':           row.region,     #todo: from dict!
            'district':         row.district,   #todo: from dict!
            'status':           row.status,     #todo: from dict!
            'subcontr_name':    row.subcontr_name,
            'start_build_time': row.start_build_time,
            'end_build_time':   row.end_build_time,
            'cabling_plan':     row.cabling_plan / 1000 if row.cabling_plan else None,  # in km
            'cabling_fact':     row.cabling_fact / 1000 if row.cabling_fact else None,  # in km
            'cabling_percent':  row.cabling_percent,
            'fosc_plan':        row.fosc_plan,
            'fosc_fact':        row.fosc_fact,
            'fosc_percent':     row.fosc_percent,
            'cross_plan':       row.cross_plan,
            'cross_fact':       row.cross_fact,
            'cross_percent':    row.cross_percent,
            'spec_trans_plan':        row.spec_trans_plan,
            'spec_trans_fact':        row.spec_trans_fact,
            'spec_trans_percent':     row.spec_trans_percent,
            'ap_plan':          row.ap_plan,
            'ap_fact':          row.ap_fact,
            'ap_percent':       row.ap_percent,
            'is_overdue':       row.is_overdue,
        }
        json_report.append(json_row)
        num_line += 1

    # footer
    # todo?

    return Response(
        json.dumps(json_report),
        content_type=b'application/json')


def get_user_writable_focls(user):
    # get explicit rules
    rules_query = DBSession.query(ResourceACLRule)\
        .filter(ResourceACLRule.principal_id==user.principal_id)\
        .filter(ResourceACLRule.scope==DataScope.identity)\
        .options(joinedload_all(ResourceACLRule.resource))

    #todo: user groups explicit rules???

    # get permission for resource and children
    allowed_res_ids = []

    def get_perms_recursive(resource):
        if resource.has_permission(DataScope.write, user):
            allowed_res_ids.append(resource.id)
        if resource.identity in [ResourceGroup.identity, FoclProject.identity]:
            for child in resource.children:
                get_perms_recursive(child)

    for rule in rules_query.all():
        get_perms_recursive(rule.resource)

    return allowed_res_ids

