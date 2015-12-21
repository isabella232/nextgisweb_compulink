from datetime import datetime

import transaction
from sqlalchemy.orm import joinedload_all

from nextgisweb import DBSession
from nextgisweb_compulink.compulink_admin.model import ConstructObject, FoclStruct
from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_log.model import LogEntry

__author__ = 'yellow'

@AbstractReactor.registry.register
class InternalUpdateReactor(AbstractReactor):
    identity = 'internal_update_focl_info'
    priority = 11

    @classmethod
    def run(cls, env):

        db_session = DBSession()
        transaction.manager.begin()

        LogEntry.info('InternalUpdateReactor started!', component=COMP_ID, group=InternalUpdateReactor.identity, append_dt=datetime.now())

        fs_resources = db_session.query(FoclStruct).all()

        for fs in fs_resources:

            # get const obj
            try:
                const_obj = db_session.query(ConstructObject).filter(ConstructObject.resource_id == fs.id).one()
            except:
                LogEntry.info('Error on update const obj with id = ' + str(fs.id),
                              component=COMP_ID, group=InternalUpdateReactor.identity, append_dt=datetime.now())
                continue

            # update from project vector layers
            const_obj.fosc_plan = cls.get_feat_count_for_layer(fs, 'fosc')
            const_obj.cross_plan = cls.get_feat_count_for_layer(fs, 'optical_cross')
            const_obj.spec_trans_plan = cls.get_feat_count_for_layer(fs, 'special_transition')


        db_session.flush()
        LogEntry.info('InternalUpdateReactor finished!', component=COMP_ID, group=InternalUpdateReactor.identity, append_dt=datetime.now())

        transaction.manager.commit()


    @classmethod
    def get_layer_by_type(cls, focl_struct, lyr_type):
        lyrs = [lyr for lyr in focl_struct.children if lyr.keyname and '_'.join(lyr.keyname.rsplit('_')[:-1]) == lyr_type]
        lyr = lyrs[0] if len(lyrs) else None
        return lyr


    @classmethod
    def get_feat_count(cls, layer):
        query = layer.feature_query()
        result = query()
        return result.total_count or None

    @classmethod
    def get_feat_count_for_layer(cls, focl_struct, layer_name):
        lyr = cls.get_layer_by_type(focl_struct, layer_name)

        if lyr:
            return cls.get_feat_count(lyr)
        else:
            return None
