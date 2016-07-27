# coding=utf-8

from __future__ import print_function

from itertools import ifilter

from os import path
from csv import DictReader

import transaction
from sqlalchemy import Table
from nextgisweb import DBSession
from nextgisweb_compulink.compulink_admin.model import Region, FederalDistrict


BASE_PATH = path.join(path.abspath(path.dirname(__file__)), path.pardir, 'init_data')


def get_from_csv(csv_path):
    with open(csv_path) as csv_file:
        csv_reader = DictReader(csv_file)
        return list(csv_reader)


def get_orig_fed(csv_fds, orig_fed_id):
    fds = filter(lambda x: x['id'] == orig_fed_id, csv_fds)
    if fds:
        return fds[0]
    else:
        raise KeyError('CSV Federal district was not found! %s' % orig_fed_id)

def get_orig_fed(csv_fds, orig_fed_id):
    fds = filter(lambda x: x['id'] == orig_fed_id, csv_fds)
    if fds:
        return fds[0]
    else:
        raise KeyError('CSV Federal district was not found! %s' % orig_fed_id)


def link_regions_to_fed(args):

    #try:
    db_session = DBSession()
    transaction.manager.begin()

    # 1. Get all federals
    fds = db_session.query(FederalDistrict).all()

    # 2. Get all regions
    regions = db_session.query(Region).all()

    # 3. Read csv file with federals (for get original fed id)
    csv_fds = get_from_csv(path.join(BASE_PATH, 'federal_districts.csv'))

    # 4. Read updated csv file with regions and federal ids
    csv_regions = get_from_csv(path.join(BASE_PATH, 'regions.csv'))

    # 5. Update regions in DB
    for region in regions:
        # get fed_id from csv by region_code
        orig_fed_id = next(ifilter(lambda x: x['region_code'] == str(region.region_code), csv_regions))['fed_id']
        # get original federal from csv
        orig_fed = next(ifilter(lambda x: x['id'] == orig_fed_id, csv_fds))
        # find federal in db by short_name
        db_fed = next(ifilter(lambda fed: fed.short_name == unicode(orig_fed['short_name'], 'utf8'), fds))
        # update db region
        region.federal_dist = db_fed

    transaction.manager.commit()
    db_session.close()

    print ('Region was linked with federal districts')

    # except Exception as ex:
    #     print('Error on region linking: %s' % (ex))
