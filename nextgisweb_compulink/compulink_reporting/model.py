# coding=utf-8

from nextgisweb import db
from nextgisweb.models import declarative_base
from nextgisweb_compulink.compulink_admin.model import PROJECT_STATUSES, PROJECT_STATUS_PROJECT

Base = declarative_base()


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
