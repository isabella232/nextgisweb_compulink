import transaction

from nextgisweb import DBSession
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.model import ModelsUtils, District, Region, ConstructObject, FoclStruct
from nextgisweb_compulink.compulink_admin.well_known_resource import REGIONS_KEYNAME, REGIONS_ID_FIELD, \
    REGIONS_NAME_FIELD, DISTRICT_KEYNAME, DISTRICT_ID_FIELD, DISTRICT_NAME_FIELD, DISTRICT_PARENT_ID_FIELD


def fill_construct_obj_12_10(args):

    db_session = DBSession()
    transaction.manager.begin()

    # remove all existing ConstructObjects
    db_session.query(ConstructObject).delete()

    region_dict = get_regions_from_resource(as_dict=True)
    district_dict = get_districts_from_resource(as_dict=True)

    # fill
    resources = db_session.query(FoclStruct)

    for focl_struct in resources:
        co = ConstructObject()
        co.name = focl_struct.display_name
        co.resource = focl_struct
        co.external_id = focl_struct.external_id

        # try to get region
        if focl_struct.region:
            if focl_struct.region in region_dict.keys():
                name = region_dict[focl_struct.region]
                try:
                    region = db_session.query(Region).filter(Region.name == name).one()
                    co.region = region
                except:
                    print 'Region name not found in regions table! Resource %s, region name = %s' % (focl_struct.id, name)
            else:
                print 'Region id not found in layer! Resource %s' % focl_struct.id

        # try to get district
        if focl_struct.district:
            if focl_struct.district in district_dict.keys():
                name = district_dict[focl_struct.district]
                try:
                    dist_query = db_session.query(District).filter(District.name == name)
                    if co.region:
                        dist_query = dist_query.filter(District.region==co.region)
                    dist = dist_query.one()
                    co.district = dist
                except:
                    print 'District name not found in district table! Resource %s, district name = %s' % (focl_struct.id, name)
            else:
                print 'District id not found in layer! Resource %s' % focl_struct.id

        #try to get project
        co.project = ModelsUtils.get_project_by_resource(focl_struct)

        co.persist()

    transaction.manager.commit()
    db_session.close()



def get_regions_from_resource(as_dict=False, sort=False):

    # get dictionary
    vector_res = VectorLayer.filter_by(keyname=REGIONS_KEYNAME).first()
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

    if sort:
        features.sort(key=lambda x: x['name'])

    if as_dict:
        return {feat['id']: feat['name'] for feat in features}

    return features



def get_districts_from_resource(as_dict=False, sort=False):

    vector_res = VectorLayer.filter_by(keyname=DISTRICT_KEYNAME).first()
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

    if sort:
        features.sort(key=lambda x: x['name'])

    if as_dict:
        return {feat['id']: feat['name'] for feat in features}

    return features
