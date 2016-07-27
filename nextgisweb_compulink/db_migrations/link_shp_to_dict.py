# coding=utf-8

from __future__ import print_function
from itertools import ifilter

import transaction
from nextgisweb import DBSession
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.model import Region, FederalDistrict, District
from nextgisweb_compulink.compulink_admin.well_known_resource import FEDERAL_KEYNAME, REGIONS_KEYNAME, DISTRICT_KEYNAME


def get_all_features(res):
    q = res.feature_query()
    return list(q())

def link_shp_to_dict(args):

    #try:
    db_session = DBSession()
    transaction.manager.begin()

    # 1. Get all dicts
    fds = db_session.query(FederalDistrict).all()
    regions = db_session.query(Region).all()
    districts = db_session.query(District).all()


    # 2. Read shp dicts (for link districts)
    res_fds = db_session.query(VectorLayer).filter(VectorLayer.keyname == FEDERAL_KEYNAME).one()
    res_regions = db_session.query(VectorLayer).filter(VectorLayer.keyname == REGIONS_KEYNAME).one()
    res_district = db_session.query(VectorLayer).filter(VectorLayer.keyname == DISTRICT_KEYNAME).one()

    fds_shp = list(res_fds.feature_query()())
    regions_shp = list(res_regions.feature_query()())
    districts_shp = list(res_district.feature_query()())

    # 3. Update shp-districts
    for district_shp in districts_shp:
        # get parent region_shp
        region_shp = next(ifilter(lambda f: f.fields['reg_id'] == district_shp.fields['parent_id'], regions_shp))
        # get region from dict
        region = next(ifilter(lambda f: f.name == region_shp.fields['name'], regions))

        # get district from dict
        district = next(
            ifilter(lambda f: f.region == region and f.name == district_shp.fields['name'], districts)
        )

        # set and save
        district_shp.fields['dist_id'] = district.id
        res_district.feature_put(district_shp)

    # 4. Update shp-regions
    for region_shp in regions_shp:
        region = next(ifilter(lambda f: f.name == region_shp.fields['name'], regions))
        region_shp.fields['reg_id'] = region.id
        res_regions.feature_put(region_shp)

    # 5. Update shp-federal
    for fd_shp in fds_shp:
        fd = next(ifilter(lambda f: f.name == fd_shp.fields['name'], fds))
        fd_shp.fields['fed_id'] = fd.id
        res_fds.feature_put(fd_shp)

    transaction.manager.commit()
    db_session.close()

    print ('Shp was linked with dictionaries')

    # except Exception as ex:
    #     print('Error on region linking: %s' % (ex))
