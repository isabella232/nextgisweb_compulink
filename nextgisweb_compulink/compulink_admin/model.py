# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from lxml import etree
import uuid
import codecs
from nextgisweb import db

from nextgisweb.models import declarative_base, DBSession
from nextgisweb.auth.models import User
from nextgisweb.resource import (ResourceGroup, Serializer, DataStructureScope, DataScope)
from nextgisweb.vector_layer.model import VectorLayer, TableInfo
from nextgisweb.wfsserver import Service as WfsService
from nextgisweb.wfsserver.model import Layer as WfsLayer
from nextgisweb_rekod.file_bucket.model import FileBucket, os
from nextgisweb_mapserver import qml
from nextgisweb_mapserver.model import MapserverStyle

from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT, \
    PROJECT_LAYER_STRUCT

from nextgisweb.resource import SerializedProperty as SP, SerializedRelationship as SR


Base = declarative_base()

BASE_PATH = os.path.abspath(os.path.dirname(__file__))
LAYERS_DEF_STYLES_PATH = os.path.join(BASE_PATH, 'layers_default_styles/')


class Region(Base):
    __tablename__ = 'compulink_region'

    identity = 'region'
    cls_display_name = "Субъект РФ"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode, nullable=False)


class District(Base):
    __tablename__ = 'compulink_district'

    identity = 'district'
    cls_display_name = "Муниципальный район"

    id = db.Column(db.Integer, primary_key=True)
    region_id = db.Column(db.Integer, db.ForeignKey(Region.id), nullable=False)
    name = db.Column(db.Unicode, nullable=False)


class Customer(Base):
    __tablename__ = 'compulink_customer'

    identity = 'customer'
    cls_display_name = "Заказчик строительства"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode, nullable=False)

class Subcontr(Base):
    __tablename__ = 'compulink_subcontr'

    identity = 'subcontr'
    cls_display_name = "Субподрядчик СМР ВОЛС"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode, nullable=False)


class FoclProject(Base, ResourceGroup):
    identity = 'focl_project'
    cls_display_name = "Проект строительства ВОЛС"

    @classmethod
    def check_parent(cls, parent):
        #tree review for unsupported parents
        parent_temp = parent
        while parent_temp:
            for unsupported_res in [FoclProject, FoclStruct, SituationPlan]:
                if isinstance(parent_temp, unsupported_res):
                    return False
            parent_temp = parent_temp.parent
        return isinstance(parent, ResourceGroup)


class FoclProjectSerializer(Serializer):
    identity = FoclProject.identity
    resclass = FoclProject

    def deserialize(self, *args, **kwargs):
        super(FoclProjectSerializer, self).deserialize(*args, **kwargs)

        #инсерт объекта в БД
        if not self.obj.id:
            self.create_focl_project_content(self.obj)

    @classmethod
    def create_focl_project_content(cls, focl_project):
        doc_res = FileBucket(parent=focl_project,
                             owner_user=focl_project.owner_user,
                             display_name="Документы")
        doc_res.persist()


class FoclStruct(Base, ResourceGroup):
    identity = 'focl_struct'
    cls_display_name = "Структура ВОЛС"

    region_id = db.Column(db.Integer, db.ForeignKey(Region.id), nullable=True)
    district_id = db.Column(db.Integer, db.ForeignKey(District.id), nullable=True)  # Муниципальный район
    settlement = db.Column(db.Unicode, nullable=True)  # Населенный пункт
    access_point_count = db.Column(db.Integer, nullable=True, default=0)  # Количество точек доступа
    deadline_contract = db.Column(db.Date, nullable=True)  # Срок сдачи по договору
    project_manager_id = db.Column(db.Integer, db.ForeignKey(User.id), nullable=True)  # Руководитель проекта
    focl_length_order = db.Column(db.Float, nullable=True, default=0)  # Протяженность ВОЛС по заказу
    focl_length_project = db.Column(db.Float, nullable=True, default=0)  # Протяженность ВОЛС по проекту
    focl_length_fact = db.Column(db.Float, nullable=True, default=0)  # Протяженность ВОЛС фактическая
    length_on_ol = db.Column(db.Float, nullable=True, default=0)  # Протяженность по ВЛ
    length_in_ground = db.Column(db.Float, nullable=True, default=0)  # Протяженность в грунте
    length_in_canalization = db.Column(db.Float, nullable=True, default=0)  # Протяженность в кабельной канализации

    customer = db.Column(db.Integer, db.ForeignKey(Customer.id), nullable=True)  # Заказчик строительства
    planned_start_date = db.Column(db.Date, nullable=True)  # Планируемая дата начала СМР
    planned_finish_date = db.Column(db.Date, nullable=True)  # Планируемая дата окончания СМР
    subcontr = db.Column(db.Integer, db.ForeignKey(Subcontr.id), nullable=True)   # Субподрядчик СМР ВОЛС

    status = db.Column(db.Unicode, nullable=True)  # Статус (проект, идет строительство, построена)
    status_upd_user = db.Column(db.Boolean, default=False)  # Статус обновлен пользователем


    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, FoclProject)

P_DSS_READ = DataStructureScope.read
P_DSS_WRITE = DataStructureScope.write
P_DS_READ = DataScope.read
P_DS_WRITE = DataScope.write

class FoclStructSerializer(Serializer):
    identity = FoclStruct.identity
    resclass = FoclStruct

    #region = SR(read=P_DSS_READ)
    settlement = SP(read=P_DSS_READ)


    def deserialize(self, *args, **kwargs):
        super(FoclStructSerializer, self).deserialize(*args, **kwargs)

        #инсерт объекта в БД
        if not self.obj.id:
            self.create_focl_struct_content(self.obj)

    @classmethod
    def create_focl_struct_content(cls, focl_struct_obj):
        layers_template_path = os.path.join(BASE_PATH, 'layers_templates/')

        wfs_service = WfsService(parent=focl_struct_obj,
                                 owner_user=focl_struct_obj.owner_user,
                                 display_name='Сервис редактирования')

        for vl_name in FOCL_LAYER_STRUCT:
            with codecs.open(os.path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                vector_layer = ModelsUtils.create_vector_layer(focl_struct_obj, json_layer_struct, vl_name)
                ModelsUtils.append_lyr_to_wfs(wfs_service, vector_layer, vl_name)
                ModelsUtils.set_default_style(vector_layer, vl_name, 'default')

        wfs_service.persist()


class SituationPlan(Base, ResourceGroup):
    identity = 'situation_plan'
    cls_display_name = "Ситуационный план"

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, FoclProject)


class SituationPlanSerializer(Serializer):
    identity = SituationPlan.identity
    resclass = SituationPlan

    def deserialize(self, *args, **kwargs):
        super(SituationPlanSerializer, self).deserialize(*args, **kwargs)

        #инсерт объекта в БД
        if not self.obj.id:
            self.create_situation_plan_content(self.obj)

    @classmethod
    def create_situation_plan_content(cls, sit_plan):
        base_path = os.path.abspath(os.path.dirname(__file__))
        layers_template_path = os.path.join(base_path, 'situation_layers_templates/')

        wfs_service = WfsService(parent=sit_plan,
                                 owner_user=sit_plan.owner_user,
                                 display_name='Сервис редактирования')

        for vl_name in SIT_PLAN_LAYER_STRUCT:
            with codecs.open(os.path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                vector_layer = ModelsUtils.create_vector_layer(sit_plan, json_layer_struct, vl_name)
                ModelsUtils.append_lyr_to_wfs(wfs_service, vector_layer, vl_name)
                ModelsUtils.set_default_style(vector_layer, vl_name, 'default')

        wfs_service.persist()




class ModelsUtils():

    @classmethod
    def create_vector_layer(cls, parent_obj, json_layer_struct, layer_name):
        from nextgisweb.resource.serialize import CompositeSerializer  # only where!!!

        vl = VectorLayer(parent=parent_obj, owner_user=parent_obj.owner_user)
        cs = CompositeSerializer(vl, parent_obj.owner_user, json_layer_struct)
        cs.deserialize()

        vl.tbl_uuid = uuid.uuid4().hex
        for fld in vl.fields:
            fld.fld_uuid = uuid.uuid4().hex

        vl.keyname = '%s_%s' % (layer_name, vl.tbl_uuid)
        vl.persist()

        # temporary workaround #266.
        vl.srs_id = vl.srs.id
        ti = TableInfo.from_layer(vl)
        ti.setup_metadata(vl._tablename)
        ti.metadata.create_all(bind=DBSession.connection())

        return vl

    @classmethod
    def append_lyr_to_wfs(cls, wfs_service, vector_layer, keyname):
        wfs_layer = WfsLayer()
        wfs_layer.keyname = keyname
        wfs_layer.display_name = vector_layer.display_name
        wfs_layer.service = wfs_service
        wfs_layer.resource = vector_layer
        wfs_service.layers.append(wfs_layer)
        #wfs_layer.persist()

    @classmethod
    def set_default_style(cls, vector_layer, keyname, style_name):
        def_style_path = os.path.join(LAYERS_DEF_STYLES_PATH, keyname+'.qml')

        if not os.path.exists(def_style_path):
            return  # Need to set common point\line\polygon style

        elem = etree.parse(def_style_path).getroot()
        dst = qml.transform(elem)
        mapserver_xml = etree.tostring(dst, pretty_print=True, encoding=unicode)

        ms = MapserverStyle(parent=vector_layer, owner_user=vector_layer.owner_user)
        ms.display_name = style_name
        ms.xml = mapserver_xml
        ms.persist()


