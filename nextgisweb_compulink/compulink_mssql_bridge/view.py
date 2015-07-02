# coding=utf-8
import json
from pyramid.response import Response
from pyramid.view import view_config


from . import DBSession
from sqlalchemy.orm import joinedload, joinedload_all
from .model import Project, ConstructObjects, ObjectWork


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.mssql.get_focl_info',
        '/compulink/mssql/get_focl_info').add_view(get_focl_info)


@view_config(renderer='json')
def get_focl_info(request):

    res_ids = request.POST.getall('ids')
    if not res_ids:
        return Response('[]')

    enabling = request.env.compulink_mssql_bridge.settings.get('enable', False)
    if not enabling:
        return Response('[]')

    constructs = DBSession.query(ConstructObjects).filter(ConstructObjects.ObjectID.in_(res_ids)).options(joinedload_all(ConstructObjects.Work3), joinedload(ConstructObjects.Work4), ).all()

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
