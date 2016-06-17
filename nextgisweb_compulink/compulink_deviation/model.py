# coding=utf-8
import types
from sqlalchemy.sql import func

from nextgisweb import db
from nextgisweb.models import declarative_base
from nextgisweb_compulink.compulink_admin.model import tometadata_event

Base = declarative_base()


class ConstructDeviation(Base):
    __tablename__ = 'construct_deviation'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)

    focl_res_id = db.Column(db.Integer, nullable=False)      # ИД ресурса объекта строительства
    focl_name = db.Column(db.Unicode, nullable=False)        # Наименование ВОЛС

    object_type = db.Column(db.VARCHAR, nullable=False)         # Тип объекта (слой)
    object_num = db.Column(db.Integer, nullable=False)          # ИД объекта в слое

    deviation_distance = db.Column(db.Integer, nullable=False)  # отклонение в метрах
    deviation_approved = db.Column(db.Boolean, nullable=False, default=False)   # отклонение утверждено

    approval_comment = db.Column(db.Unicode, nullable=True)     # комментарий к отклонению
    approval_author = db.Column(db.Unicode, nullable=True)  # автор утверждения
    approval_timestamp = db.Column(db.DateTime, nullable=True)  # Дата\Время утверждения


ConstructDeviation.__table__.tometadata = types.MethodType(tometadata_event, ConstructDeviation.__table__)
