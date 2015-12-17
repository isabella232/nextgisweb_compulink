# coding=utf-8
import types
from sqlalchemy import event, ForeignKey
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import relationship

from nextgisweb import db
from nextgisweb.file_storage import FileObj
from nextgisweb.models import declarative_base
from nextgisweb.resource import Resource
from nextgisweb_compulink.compulink_admin.model import PROJECT_STATUSES, PROJECT_STATUS_PROJECT, Region, \
    tometadata_event

Base = declarative_base()

#TODO: move ConstructionStatusReport to scheme compulink

class ConstructionStatusReport(Base):
    __tablename__ = 'compulink_status_report'

    id = db.Column(db.Integer, primary_key=True)
    focl_res_id = db.Column(db.Integer, nullable=True)      # ИД ресурса объекта строительства
    external_id = db.Column(db.Unicode, nullable=True)      # Внешний ИД (MSSQL)

    focl_name = db.Column(db.Unicode, nullable=True)        # Наименование ВОЛС
    region = db.Column(db.Unicode, nullable=True)           # Субъект РФ
    district = db.Column(db.Unicode, nullable=True)         # Муниципальный район
    status = db.Column(db.VARCHAR, nullable=True)           # Статус строительства

    subcontr_name = db.Column(db.Unicode, nullable=True)        # Подрядчик строительства
    start_build_time = db.Column(db.DateTime, nullable=True)    # Строительство ВОЛС (начало)
    end_build_time = db.Column(db.DateTime, nullable=True)      # Строительство ВОЛС (окончание)
    start_deliver_time = db.Column(db.DateTime, nullable=True)    # Cдача заказчику (начало)
    end_deliver_time = db.Column(db.DateTime, nullable=True)      # Cдача заказчику (окончание)

    cabling_plan = db.Column(db.Float, nullable=True)      # Прокладка ОК План (км)
    cabling_fact = db.Column(db.Float, nullable=True)      # Прокладка ОК Факт (км)
    cabling_percent = db.Column(db.Float, nullable=True)   # Прокладка ОК %

    fosc_plan = db.Column(db.Integer, nullable=True)      # Разварка муфт План (шт)
    fosc_fact = db.Column(db.Integer, nullable=True)      # Разварка муфт Факт (шт)
    fosc_percent = db.Column(db.Integer, nullable=True)   # Разварка муфт %

    cross_plan = db.Column(db.Integer, nullable=True)      # Разварка кроссов План (шт)
    cross_fact = db.Column(db.Integer, nullable=True)      # Разварка кроссов Факт (шт)
    cross_percent = db.Column(db.Integer, nullable=True)   # Разварка кроссов %

    spec_trans_plan = db.Column(db.Integer, nullable=True)      # Строительство ГНБ переходов План (шт)
    spec_trans_fact = db.Column(db.Integer, nullable=True)      # Строительство ГНБ переходов Факт (шт)
    spec_trans_percent = db.Column(db.Integer, nullable=True)   # Строительство ГНБ переходов %

    ap_plan = db.Column(db.Integer, nullable=True)      # Монтаж точек доступа План (шт)
    ap_fact = db.Column(db.Integer, nullable=True)      # Монтаж точек доступа Факт (шт)
    ap_percent = db.Column(db.Integer, nullable=True)   # Монтаж точек доступа %

    is_overdue = db.Column(db.Boolean, nullable=True)   # Работы по линии просрочены
    is_month_overdue = db.Column(db.Boolean, nullable=True)   # Работы по линии просрочены более чем на месяц


class Calendar(Base):
    __tablename__ = 'calendar'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    full_date = db.Column(db.Date, index=True)
    year_number = db.Column(db.SmallInteger, index=True)
    semester_number = db.Column(db.SmallInteger)
    semester_name = db.Column(db.Unicode(length=15))
    quarter_number = db.Column(db.SmallInteger, index=True)
    quarter_name = db.Column(db.Unicode(length=15))
    month_number = db.Column(db.SmallInteger, index=True)
    month_name = db.Column(db.Unicode(length=8))
    year_week_number = db.Column(db.SmallInteger)
    month_week_number = db.Column(db.SmallInteger)
    month_decade_number = db.Column(db.SmallInteger)
    year_day_number = db.Column(db.SmallInteger, index=True)
    month_day_number = db.Column(db.SmallInteger)
    week_day_number = db.Column(db.SmallInteger)
    week_day_name = db.Column(db.Unicode(length=11))
    week_day_short_name = db.Column(db.Unicode(length=2))
    weekend = db.Column(db.Boolean)


# ---- RT DOMAIN MODELS ----
class RtMacroDivision(Base):
    __tablename__ = 'rt_macro_division'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300), nullable=False)
    short_name = db.Column(db.Unicode(length=100), nullable=True)


class RtBranch(Base):
    __tablename__ = 'rt_branch'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300))
    short_name = db.Column(db.Unicode(length=100), nullable=True)
    macro_division_id = db.Column(db.Integer, ForeignKey(RtMacroDivision.id))

    rt_macro_division = relationship(RtMacroDivision, backref='branches')


class RtBranchRegion(Base):
    __tablename__ = 'rt_branch_region'
    __table_args__ = {'schema': 'compulink'}

    region_id = db.Column(db.Integer, ForeignKey(Region.id), primary_key=True)
    rt_branch_id = db.Column(db.Integer, ForeignKey(RtBranch.id), nullable=False)

    region = relationship(Region)
    rt_branch = relationship(RtBranch, backref='regions')


#---- Metadata and scheme staff
Calendar.__table__.tometadata = types.MethodType(tometadata_event, Calendar.__table__)
RtMacroDivision.__table__.tometadata = types.MethodType(tometadata_event, RtMacroDivision.__table__)
RtBranch.__table__.tometadata = types.MethodType(tometadata_event, RtBranch.__table__)
RtBranchRegion.__table__.tometadata = types.MethodType(tometadata_event, RtBranchRegion.__table__)


#---- Rt reports -----

# - Mixins
class BaseBuiltReportMixin(object):
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, index=True, nullable=False)

    @declared_attr
    def build_date_id(cls):
        return db.Column(db.Integer, ForeignKey(Calendar.id), index=True, nullable=False)

    @declared_attr
    def build_date(cls):
        return relationship(Calendar)

    # @declared_attr
    # def resource(cls):
    #     return relationship(Resource, primaryjoin=Resource.id==cls.resource_id)

class ObjectTypeMixin(object):
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.UnicodeText, nullable=True)

# - FOSC
class FoscType(Base, ObjectTypeMixin):
    __tablename__ = 'fosc_type'
    type = db.Column(db.Unicode(length=100), nullable=False)


class BuiltFosc(Base, BaseBuiltReportMixin):
    __tablename__ = 'built_fosc'

    fosc_count = db.Column(db.Integer, nullable=False)
    fosc_type_id = db.Column(db.Integer, ForeignKey(FoscType.id), nullable=True)

    fosc_type = relationship(FoscType)

# - Cable
class CableLayingMethod(Base, ObjectTypeMixin):
    __tablename__ = 'cable_laying_method'
    method = db.Column(db.Unicode(length=100), nullable=False)


class BuiltCable(Base, BaseBuiltReportMixin):
    __tablename__ = 'built_cable'

    cable_length = db.Column(db.Float, nullable=False)
    laying_method_id = db.Column(db.Integer, ForeignKey(CableLayingMethod.id), nullable=True)

    laying_method = relationship(CableLayingMethod)

# - Cross
class OpticalCrossType(Base, ObjectTypeMixin):
    __tablename__ = 'optical_cross_type'
    type = db.Column(db.Unicode(length=100), nullable=False)


class BuiltOpticalCross(Base, BaseBuiltReportMixin):
    __tablename__ = 'built_optical_cross'

    optical_cross_count = db.Column(db.Integer, nullable=False)
    optical_cross_type_id = db.Column(db.Integer, ForeignKey(OpticalCrossType.id), nullable=True)

    optical_cross_type = relationship(OpticalCrossType)

# - AccessPoint
class AccessPointType(Base, ObjectTypeMixin):
    __tablename__ = 'access_point_type'
    type = db.Column(db.Unicode(length=100), nullable=False)


class BuiltAccessPoint(Base, BaseBuiltReportMixin):
    __tablename__ = 'built_access_point'

    access_point_count = db.Column(db.Integer, nullable=False)
    access_point_type_id = db.Column(db.Integer, ForeignKey(AccessPointType.id), nullable=True)

    access_point_type = relationship(AccessPointType)

# -  Spec Transition
class SpecLayingMethod(Base, ObjectTypeMixin):
    __tablename__ = 'spec_laying_method'
    method = db.Column(db.Unicode(length=100), nullable=False)


class BuiltSpecTransition(Base, BaseBuiltReportMixin):
    __tablename__ = 'built_spec_transition'

    spec_trans_length = db.Column(db.Float, nullable=False)
    spec_trans_count = db.Column(db.Integer, nullable=False)
    spec_laying_method_id = db.Column(db.Integer, ForeignKey(SpecLayingMethod.id), nullable=True)

    spec_laying_method = relationship(SpecLayingMethod)

#---- Metadata and scheme staff
FoscType.__table__.tometadata = types.MethodType(tometadata_event, FoscType.__table__)
BuiltFosc.__table__.tometadata = types.MethodType(tometadata_event, BuiltFosc.__table__)
CableLayingMethod.__table__.tometadata = types.MethodType(tometadata_event, CableLayingMethod.__table__)
BuiltCable.__table__.tometadata = types.MethodType(tometadata_event, BuiltCable.__table__)
OpticalCrossType.__table__.tometadata = types.MethodType(tometadata_event, OpticalCrossType.__table__)
BuiltOpticalCross.__table__.tometadata = types.MethodType(tometadata_event, BuiltOpticalCross.__table__)
AccessPointType.__table__.tometadata = types.MethodType(tometadata_event, AccessPointType.__table__)
BuiltAccessPoint.__table__.tometadata = types.MethodType(tometadata_event, BuiltAccessPoint.__table__)
SpecLayingMethod.__table__.tometadata = types.MethodType(tometadata_event, SpecLayingMethod.__table__)
BuiltSpecTransition.__table__.tometadata = types.MethodType(tometadata_event, BuiltSpecTransition.__table__)