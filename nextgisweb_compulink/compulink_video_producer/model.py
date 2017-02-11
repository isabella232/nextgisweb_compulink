# coding=utf-8
import types
from nextgisweb.auth import Principal
from sqlalchemy import func
from sqlalchemy import ForeignKey

from nextgisweb import db
from nextgisweb.auth import User
from nextgisweb.file_storage import FileObj
from nextgisweb.models import declarative_base
from nextgisweb_compulink.compulink_admin.model import tometadata_event

Base = declarative_base()


class TaskState:
    CREATED = 0
    STARTED = 1
    SUCCESS_FINISHED = 2
    ERROR_FINISHED = 3
    TIMEOUT_FINISHED = 4


class VideoProduceTask(Base):
    __tablename__ = 'video_produce_task'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode, nullable=True)
    # task submitter
    user_id = db.Column(db.Integer, nullable=False)
    # task state
    state = db.Column(db.Integer, nullable=False, default=TaskState.CREATED)
    creation_dt = db.Column(db.DateTime, nullable=False, server_default=func.now())
    update_dt = db.Column(db.DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    error_text = db.Column(db.Unicode, nullable=True)
    # task params
    resource_id = db.Column(db.Integer, nullable=False)
    lat_center = db.Column(db.Float, nullable=False)
    lon_center = db.Column(db.Float, nullable=False)
    zoom = db.Column(db.Integer, nullable=False)
    sound_enabled = db.Column(db.Boolean, nullable=False)
    photo_enabled = db.Column(db.Boolean, nullable=False)
    units = db.Column(db.Unicode, nullable=False)
    units_count = db.Column(db.Integer, nullable=False)
    # task results
    fileobj_id = db.Column(db.Integer, nullable=True)
    file_name = db.Column(db.Unicode, nullable=True)
    file_size = db.Column(db.BigInteger, nullable=True)
    file_mime_type = db.Column(db.Unicode, nullable=True)

#---- Metadata and scheme staff
#VideoProduceTask.__table__.tometadata = types.MethodType(tometadata_event, VideoProduceTask.__table__)
