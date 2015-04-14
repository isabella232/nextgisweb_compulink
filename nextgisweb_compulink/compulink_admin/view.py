# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from nextgisweb import DBSession
from nextgisweb.env import env
from nextgisweb.resource import Widget, Resource
from nextgisweb.vector_layer import VectorLayer

from .model import FoclProject, FoclStruct, SituationPlan, PROJECT_STATUS_PROJECT, PROJECT_STATUS_FINISHED, \
    PROJECT_STATUS_IN_PROGRESS
from .well_known_resource import REGIONS_ID_FIELD, REGIONS_NAME_FIELD, \
    DISTRICT_ID_FIELD, DISTRICT_NAME_FIELD, DISTRICT_PARENT_ID_FIELD, DISTRICT_KEYNAME, REGIONS_KEYNAME


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


# TODO: NEED BIG REFACTORING!!!!

def get_regions_from_resource():

    dbsession = DBSession()
    # get dictionary
    vector_res = dbsession.query(VectorLayer).filter(VectorLayer.keyname == REGIONS_KEYNAME).first()
    if not vector_res:
        return []

    # check fields
    fields_names = [field.keyname for field in vector_res.fields]
    if REGIONS_ID_FIELD not in fields_names or REGIONS_NAME_FIELD not in fields_names:
        return []

    # receive values
    query = vector_res.feature_query()
    features = []
    for f in query():
        features.append({'name': f.fields[REGIONS_NAME_FIELD], 'id': f.fields[REGIONS_ID_FIELD]})

    dbsession.close()
    return features


def get_region_name(reg_id):
    if not reg_id:
        return ''

    dbsession = DBSession()
    # get dictionary
    vector_res = dbsession.query(VectorLayer).filter(VectorLayer.keyname == REGIONS_KEYNAME).first()
    if not vector_res:
        return ''

    # check fields
    fields_names = [field.keyname for field in vector_res.fields]
    if REGIONS_ID_FIELD not in fields_names or REGIONS_NAME_FIELD not in fields_names:
        return ''

    # receive values
    query = vector_res.feature_query()
    query.filter_by(reg_id=reg_id)  # TODO: Need remake to REGIONS_ID_FIELD
    query.limit(1)

    feature = None
    for f in query():
        feature = f

    dbsession.close()
    return feature.fields[REGIONS_NAME_FIELD]



def get_districts_from_resource():
    dbsession = DBSession()

    vector_res = dbsession.query(VectorLayer).filter(VectorLayer.keyname == DISTRICT_KEYNAME).first()
    if not vector_res:
        return []

    fields_names = [field.keyname for field in vector_res.fields]
    if DISTRICT_ID_FIELD not in fields_names or \
       DISTRICT_NAME_FIELD not in fields_names or \
       DISTRICT_PARENT_ID_FIELD not in fields_names:
        return []

    query = vector_res.feature_query()
    features = []
    for f in query():
        features.append({
            'name': f.fields[DISTRICT_NAME_FIELD],
            'id': f.fields[DISTRICT_ID_FIELD],
            'parent_id': f.fields[DISTRICT_PARENT_ID_FIELD]
        })

    dbsession.close()
    return features


def get_district_name(distr_id):

    dbsession = DBSession()

    vector_res = dbsession.query(VectorLayer).filter(VectorLayer.keyname == DISTRICT_KEYNAME).first()
    if not vector_res:
        return ''

    fields_names = [field.keyname for field in vector_res.fields]
    if DISTRICT_ID_FIELD not in fields_names or \
       DISTRICT_NAME_FIELD not in fields_names or \
       DISTRICT_PARENT_ID_FIELD not in fields_names:
        return ''

    # receive values
    query = vector_res.feature_query()
    query.filter_by(dist_id=distr_id)  # TODO: Need remake to DISTRICT_NAME_FIELD
    query.limit(1)

    feature = None
    for f in query():
        feature = f

    dbsession.close()
    return feature.fields[DISTRICT_NAME_FIELD]


def get_project_statuses():
    return [
        {'name': 'Проект', 'id': PROJECT_STATUS_PROJECT},
        {'name': 'Идет строительство', 'id': PROJECT_STATUS_IN_PROGRESS},
        {'name': 'Построен', 'id': PROJECT_STATUS_FINISHED}
    ]
    return []