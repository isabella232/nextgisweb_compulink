# coding=utf-8
import json
from pyramid.response import Response
from pyramid.view import view_config


from nextgisweb import DBSession
from .model import ConstructionStatusReport


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.reporting.get_status_report',
        '/compulink/reporting/get_status_report').add_view(get_status_report)


@view_config(renderer='json')
def get_status_report(request):

    #TODO:
    # user

    constructs = DBSession.query(ConstructionStatusReport).all()

    focl_info_list = []
    for construct in constructs:
        work3 = construct.Work3
        work4 = construct.Work4

        focl_info = {
            'external_id': construct.ObjectID,
            'settlement': construct.LocalityName,
            'access_point_count': construct.AccessPointAmount,
            'need_construct': 'Да' if construct.IsLineConstructRequired else 'Нет',
            'point_a': construct.LinePointA,
            'point_b': construct.LinePointB,
            'focl_length': construct.PreliminaryLineLength,
            'start_build_time': work3.AgreementStartDateWork.strftime('%d.%m.%y') if work3 else '',
            'end_build_time': work3.AgreementFinishDateWork.strftime('%d.%m.%y') if work3 else '',
            'start_exp_time': work4.AgreementStartDateWork.strftime('%d.%m.%y') if work4 else '',
            'end_exp_time': work4.AgreementFinishDateWork.strftime('%d.%m.%y') if work4 else '',
            'subcontr': work3.SubContractor.ContractorName if work3 else '',
        }
        focl_info_list.append(focl_info)

    return Response(json.dumps(focl_info_list))
