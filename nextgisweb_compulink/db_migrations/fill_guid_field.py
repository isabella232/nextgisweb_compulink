# coding=utf-8
import uuid

import os
import transaction
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession
from nextgisweb.vector_layer import VectorLayer

BASE_PATH = os.path.abspath(os.path.dirname(__file__))


def fill_guid_field(args):
    db_session = DBSession()

    transaction.manager.begin()

    resources = db_session.query(VectorLayer).options(joinedload_all('fields')).filter(VectorLayer.keyname.like('real_%')).all()

    for vec_layer in resources:
        try:
            query = vec_layer.feature_query()
            query.geom()

            for feat in query():
                if not feat.fields['feat_guid']:
                    feat.fields['feat_guid'] = str(uuid.uuid4().hex)
                    vec_layer.feature_put(feat)

            print "GUIDs of %s was updated!" % vec_layer.keyname

        except Exception, ex:
            print "Error on update GUIDs %s: %s" % (vec_layer.keyname, ex.message)
        db_session.flush()


    transaction.manager.commit()
    db_session.close()
