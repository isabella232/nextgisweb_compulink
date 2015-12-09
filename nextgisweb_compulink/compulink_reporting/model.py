# coding=utf-8
import types
from sqlalchemy import event, ForeignKey
from sqlalchemy.orm import relationship

from nextgisweb import db
from nextgisweb.models import declarative_base
from nextgisweb_compulink.compulink_admin.model import PROJECT_STATUSES, PROJECT_STATUS_PROJECT, Region

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

    id = db.Column(db.Integer, primary_key=True)
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


def tometadata(self, metadata):
    def create_schema(*args, **kwargs):
        try:
            db.DDL('CREATE SCHEMA compulink')
        finally:
            pass
    result = db.Table.tometadata(self, metadata)
    event.listen(result, "before_create", create_schema)
    return result

Calendar.__table__.tometadata = types.MethodType(tometadata, Calendar.__table__)


# ---- RT DOMAIN MODELS ----
class RtMacroDivision(Base):
    __tablename__ = 'rt_macro_division'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300))
    short_name = db.Column(db.Unicode(length=100), nullable=True)


class RtBranch(Base):
    __tablename__ = 'rt_branch'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300))
    short_name = db.Column(db.Unicode(length=100), nullable=True)
    macro_division_id = db.Column(db.Integer, ForeignKey(RtMacroDivision.id))

    rt_macro_division = relationship(RtMacroDivision)


class RtBranchRegion(Base):
    __tablename__ = 'rt_branch_region'
    __table_args__ = {'schema': 'compulink'}

    region_id = db.Column(db.Integer, ForeignKey(Region.id), primary_key=True)
    rt_branch_id = db.Column(db.Integer, ForeignKey(RtBranch.id))

    region = relationship(Region)
    rt_branch = relationship(RtBranch)
