__author__ = 'yellow'

from datetime import datetime
import json


class DateTimeJSONEncoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()

        return super(DateTimeJSONEncoder, self).default(obj)
