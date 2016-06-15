from dateutil.relativedelta import relativedelta
from sqlalchemy import func

from nextgisweb import DBSession
from datetime import datetime, date
import transaction
from nextgisweb_compulink.compulink_admin.model import FoclStruct, PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED, \
    ConstructObject
from nextgisweb_compulink.compulink_reporting.model import ConstructionStatusReport, BuiltCable, BuiltAccessPoint, \
    BuiltFosc, BuiltOpticalCross, BuiltSpecTransition
from nextgisweb_log.model import LogEntry


__author__ = 'yellow'


class DeviationChecker:

    @classmethod
    def run(cls):

        ngw_session = DBSession()
        transaction.manager.begin()

        # get all focls
        fs_resources = ngw_session.query(FoclStruct).all()

        for fs in fs_resources:
            # get counts features in project layers
            project_layers = {}
            for layers in fs.children():
                # if layer is project:
                # get count
                pass

            if sum(project_layers.values()) > 0:
                #real check
                for layer_type, count in project_layers:
                    if count > 0:
                        # get actual layer
                        # for feat in actual layer
                        #       search nearest feature from layer type
                        #       if distan > settings_distance:
                        #           write to layer
                        pass

        transaction.manager.commit()
