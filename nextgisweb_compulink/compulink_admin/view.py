# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from nextgisweb import DBSession
from nextgisweb.env import env
from nextgisweb.resource import Widget, Resource

from .model import FoclProject, FoclStruct, SituationPlan, PROJECT_STATUS_PROJECT, PROJECT_STATUS_FINISHED, \
    PROJECT_STATUS_IN_PROGRESS
from nextgisweb.vector_layer import VectorLayer


class FoclProjectWidget(Widget):
    resource = FoclProject
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/FoclProjectWidget'


class FoclStructWidget(Widget):
    resource = FoclStruct
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/FoclStructWidget'


class SituationPlanWidget(Widget):
    resource = SituationPlan
    operation = ('create', 'update')
    amdmod = 'ngw-compulink-admin/SituationPlanWidget'


def setup_pyramid(comp, config):
    #Регистрируем секцую Проект строительства ВОЛС в Групповом ресурсе
    Resource.__psection__.register(
       key='focl_project', priority=10,
       is_applicable=lambda obj: isinstance(obj, FoclProject),
       template='nextgisweb_compulink:compulink_admin/template/focl_project_section.mako')


def get_regions_from_resource():
    reg_res_id = env.compulink_admin.settings.get('regions_resouce_id')
    if not reg_res_id:
        return []

    dbsession = DBSession()

    vector_res = dbsession.query(VectorLayer).filter(VectorLayer.id == reg_res_id).first()
    if not vector_res:
        return []

    fields_names = [field.keyname for field in vector_res.fields]
    if 'name' not in fields_names or 'reg_id' not in fields_names:
        return []

    query = vector_res.feature_query()
    features = []
    for f in query():
        features.append({'name': f.fields['name'], 'id': f.fields['reg_id']})

    dbsession.close()
    return features


def get_districts_from_resource():
    distr_res_id = env.compulink_admin.settings.get('districts_resouce_id')
    if not distr_res_id:
        return []

    dbsession = DBSession()

    vector_res = dbsession.query(VectorLayer).filter(VectorLayer.id == distr_res_id).first()
    if not vector_res:
        return []

    fields_names = [field.keyname for field in vector_res.fields]
    if 'name' not in fields_names or 'dist_id' not in fields_names or 'parent_id' not in fields_names:
        return []

    query = vector_res.feature_query()
    features = []
    for f in query():
        features.append({'name': f.fields['name'], 'id': f.fields['dist_id'], 'parent_id': f.fields['parent_id']})

    dbsession.close()
    return features


def get_project_statuses():
    return [
        {'name': 'Проект', 'id': PROJECT_STATUS_PROJECT},
        {'name': 'Идет строительство', 'id': PROJECT_STATUS_IN_PROGRESS},
        {'name': 'Построен', 'id': PROJECT_STATUS_FINISHED}
    ]
    return []
