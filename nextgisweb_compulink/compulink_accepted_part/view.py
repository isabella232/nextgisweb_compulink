# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import print_function
from __future__ import print_function
from __future__ import unicode_literals

import json

import transaction
from datetime import datetime

from nextgisweb.feature_layer import Feature

from nextgisweb_compulink.compulink_admin.model import FoclStructScope, FoclStruct

from nextgisweb import DBSession
from nextgisweb.resource import Resource
from nextgisweb.resource.serialize import CompositeSerializer
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.utils import error_response, success_response
from pyramid.httpexceptions import HTTPForbidden, HTTPNotFound, HTTPBadRequest
from pyramid.response import Response
from pyramid.view import view_config


def setup_pyramid(comp, config):
    config.add_route(
        'compulink.get_layer_info',
        '/compulink/accepted-parts/layer-info/{layer_type}/{construct_object_id:\d+}',
        client=('layer_type', 'construct_object_id',)).add_view(get_layer_info)

    config.add_route(
        'compulink.accepted_part_crud',
        '/compulink/accepted-parts/{construct_object_id:\d+}/accepted-part/{accepted_part_id:\d+}',
        client=('layer_type', 'construct_object_id', 'accepted_part_id',)) \
        .add_view(create_accepted_part, request_method='PUT') \
        .add_view(delete_accepted_part, request_method='DELETE') \
        .add_view(update_accepted_part, request_method='POST')

    config.add_route(
        'compulink.get_accepted_parts_rights',
        '/compulink/accepted-parts/{construct_object_id:\d+}/access_level',
        client=('construct_object_id',)).add_view(get_access_level, request_method='GET', renderer='json')


@view_config(renderer='json')
def get_layer_info(request):
    construct_object_id = request.matchdict['construct_object_id']
    layer_type = request.matchdict['layer_type']

    session = DBSession()
    resource = session.query(Resource).filter(Resource.id == construct_object_id).first()
    layer_info = get_vector_layer_by_layer_type(resource, layer_type)

    if not layer_info:
        return error_response(u'Слой типа "%s" не найден'.format(layer_type))

    serializer = CompositeSerializer(layer_info, request.user)
    serializer.serialize()

    return Response(json.dumps(serializer.data))


def get_vector_layer_by_layer_type(resource, layer_type):
    layer = None
    for child_resource in resource.children:
        if child_resource.identity != VectorLayer.identity:
            continue
        resource_layer_type = '_'.join(child_resource.keyname.rsplit('_')[0:-1])
        if layer_type == resource_layer_type:
            layer = child_resource
            break
    return layer


@view_config(renderer='json')
def create_accepted_part(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()
    if request.method != 'PUT':
        return error_response(u'Метод не поддерживается! Необходим PUT')
    construct_object_id = request.matchdict['construct_object_id']

    try:
        db_session = DBSession()
        transaction.manager.begin()

        #get project
        parent_res = db_session.query(FoclStruct).get(construct_object_id)

        #check exists and perms
        if not parent_res:
            return error_response(u'Не найден объект строительства')
        if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)): #TODO: special rights!
            return error_response(u'У вас недостаточно прав для изменения информации о принятых участках')

        #get layer
        accepted_part_layer = [res for res in parent_res.children if (res.keyname and res.keyname.startswith(u'accepted_part_'))]
        if len(accepted_part_layer) < 0:
            return error_response(u'Не найден слой с принятыми участками')
        accepted_part_layer = accepted_part_layer[0]

        #create feat
        data = request.POST
        info = {
            'act_number_date': data['act_number_date'],
            'acceptor': request.user.display_name or request.user.keyname,
            'subcontr_name': data['subcontr_name'],
            'comment': data.get('comment'),
            'change_author': request.user.display_name or request.user.keyname,
            'change_date': datetime.now(),
        }
        feature = Feature(
            fields=info,
            geom=data['geom']
        )

        # save feat
        accepted_part_layer.feature_create(feature)
        transaction.manager.commit()

    except Exception as ex:
        return error_response(ex.message)

    return success_response()


@view_config(renderer='json')
def delete_accepted_part(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()
    if request.method != 'DELETE':
        return error_response(u'Метод не поддерживается! Необходим DELETE')

    construct_object_id = request.matchdict['construct_object_id']
    accepted_part_id = request.matchdict['accepted_part_id']

    try:
        db_session = DBSession()
        transaction.manager.begin()

        #get project
        parent_res = db_session.query(FoclStruct).get(construct_object_id)

        #check exists and perms
        if not parent_res:
            return error_response(u'Не найден объект строительства')
        if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)): #TODO: special rights!
            return error_response(u'У вас недостаточно прав для изменения информации о принятых участках')

        #get layer
        accepted_part_layer = [res for res in parent_res.children if (res.keyname and res.keyname.startswith(u'accepted_part_'))]
        if len(accepted_part_layer) < 0:
            return error_response(u'Не найден слой с принятыми участками')
        accepted_part_layer = accepted_part_layer[0]

        feature_id = int(accepted_part_id)

        accepted_part_layer.feature_delete(feature_id)
        transaction.manager.commit()

    except Exception as ex:
        return error_response(ex.message)

    return success_response()


@view_config(renderer='json')
def update_accepted_part(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()
    if request.method != 'POST':
        return error_response(u'Метод не поддерживается! Необходим POST')

    construct_object_id = request.matchdict['construct_object_id']
    accepted_part_id = request.matchdict['accepted_part_id']

    try:
        db_session = DBSession()
        transaction.manager.begin()

        #get project
        parent_res = db_session.query(FoclStruct).get(construct_object_id)

        #check exists and perms
        if not parent_res:
            return error_response(u'Не найден объект строительства')
        if not (request.user.is_administrator or parent_res.has_permission(FoclStructScope.edit_data, request.user)): #TODO: special rights!
            return error_response(u'У вас недостаточно прав для изменения информации о принятых участках')

        #get layer
        accepted_part_layer = [res for res in parent_res.children if (res.keyname and res.keyname.startswith(u'accepted_part_'))]
        if len(accepted_part_layer) < 0:
            return error_response(u'Не найден слой с принятыми участками')
        accepted_part_layer = accepted_part_layer[0]

        query = accepted_part_layer.feature_query()
        query.geom()
        query.filter_by(id=accepted_part_id)
        query.limit(1)

        feature = None
        for f in query():
            feature = f

        if not feature:
            return error_response(u'Редактируемый объект не найден')

        #update feat
        data = request.POST
        feature.fields['act_number_date'] = data['act_number_date'],
        feature.fields['subcontr_name'] = data['subcontr_name'],
        feature.fields['comment'] = data.get('comment', feature.fields['comment']),
        feature.fields['change_author'] = request.user.display_name or request.user.keyname
        feature.fields['change_date'] = datetime.now()
        feature.geom = data['geom'] if 'geom' in data else feature.geom

        accepted_part_layer.feature_put(feature)
        transaction.manager.commit()

    except Exception as ex:
        return error_response(ex.message)

    return success_response()


def get_access_level(request):
    # special rights
    if request.user.keyname == 'guest':
        return {'access_level': 'disable'}
    if request.user.is_administrator:
        return {'access_level': 'edit'}

    # check
    construct_object_id = request.matchdict['construct_object_id']
    dbsession = DBSession()
    try:
        focl_resource = dbsession.query(FoclStruct).get(construct_object_id)
    except:
        raise HTTPNotFound()

    if focl_resource.has_permission(FoclStructScope.edit_accepted_parts, request.user):
        return {'access_level': 'edit'}
    elif focl_resource.has_permission(FoclStructScope.read_accepted_parts, request.user):
        return {'access_level': 'list'}
    else:
        return {'access_level': 'disable'}
