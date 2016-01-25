from dateutil.relativedelta import relativedelta

from nextgisweb_compulink.compulink_admin.model import PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED

__author__ = 'yellow'

from datetime import datetime
from datetime import date
import json


class DateTimeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime) or isinstance(obj, date):
            return obj.isoformat()

        return super(DateTimeJSONEncoder, self).default(obj)


class OverdueStatusCalculator:

    @classmethod
    def overdue_status(cls, end_build_time, const_obj_status):
        now_dt = date.today()

        if end_build_time and \
           now_dt > end_build_time and \
           const_obj_status not in [PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED]:
            return True
        else:
            return False


    @classmethod
    def month_overdue_status(cls, end_build_time, const_obj_status):
        now_dt = date.today()

        if cls.overdue_status(end_build_time, const_obj_status):
            return now_dt - relativedelta(months=1) > end_build_time
        else:
            return False