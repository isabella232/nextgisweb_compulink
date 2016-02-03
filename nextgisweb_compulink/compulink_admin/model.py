# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
import types
import uuid
import codecs
from sqlalchemy import ForeignKey, event
from sqlalchemy.orm import relationship, validates
from nextgisweb import db
from nextgisweb.models import declarative_base, DBSession
from nextgisweb.resource import (ResourceGroup, Serializer, DataScope, ResourceScope, Resource, Scope, Permission)
from nextgisweb.vector_layer.model import VectorLayer, TableInfo
from nextgisweb.webmap.adapter import ImageAdapter
from nextgisweb.webmap.model import WebMap, WebMapItem
from nextgisweb.wfsserver import Service as WfsService
from nextgisweb.wfsserver.model import Layer as WfsLayer
from nextgisweb_rekod.file_bucket.model import FileBucket, os
from nextgisweb_mapserver.model import MapserverStyle
from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT, \
    PROJECT_LAYER_STRUCT, FOCL_REAL_LAYER_STRUCT
from nextgisweb.resource import SerializedProperty as SP, SerializedRelationship as SR

Base = declarative_base()

BASE_PATH = os.path.abspath(os.path.dirname(__file__))
LAYERS_DEF_STYLES_PATH = os.path.join(BASE_PATH, 'layers_default_styles/')

PROJECT_STATUS_PROJECT = 'project'
PROJECT_STATUS_IN_PROGRESS = 'in_progress'
PROJECT_STATUS_BUILT = 'built'
PROJECT_STATUS_DELIVERED = 'delivered'
_PROJECT_STATUS_FINISHED = 'finished'

PROJECT_STATUSES = (PROJECT_STATUS_PROJECT, PROJECT_STATUS_IN_PROGRESS, PROJECT_STATUS_BUILT, PROJECT_STATUS_DELIVERED)


class FoclProject(Base, ResourceGroup):
    identity = 'focl_project'
    cls_display_name = "Проект"

    @classmethod
    def check_parent(cls, parent):
        # tree review for unsupported parents
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

        # object insert in db
        if not self.obj.id:
            self.create_focl_project_content(self.obj)

    @classmethod
    def create_focl_project_content(cls, focl_project):
        doc_res = FileBucket(parent=focl_project,
                             owner_user=focl_project.owner_user,
                             display_name="Документы")
        doc_res.persist()


class FoclStructScope(Scope):
    identity = 'focl_struct'
    label = u'Объект строительства'

    edit_prop = Permission(u'Изменение свойств')


class FoclStruct(Base, ResourceGroup):
    __scope__ = (DataScope, FoclStructScope)

    identity = 'focl_struct'
    cls_display_name = "Объект строительства"

    region = db.Column(db.Unicode, nullable=True)  # Справочник, как слой: Регионы
    district = db.Column(db.Unicode, nullable=True)  # Справочник, как слой: Муниципальный район
    external_id = db.Column(db.Unicode, nullable=True)  # Внешний идентификатор
    status = db.Column(db.Enum(PROJECT_STATUSES, native_enum=False), default=PROJECT_STATUS_PROJECT,
                       nullable=True)  # Статус (проект, идет строительство, построена)
    status_upd_user = db.Column(db.Boolean, default=False)  # Статус обновлен пользователем
    status_upd_dt = db.Column(db.DateTime, nullable=True)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, FoclProject)


P_DS_READ = DataScope.read
P_DS_WRITE = DataScope.write
PR_READ = ResourceScope.read
PR_UPDATE = ResourceScope.update


class FoclStructSerializer(Serializer):
    identity = FoclStruct.identity
    resclass = FoclStruct

    region = SP(read=PR_READ, write=PR_UPDATE)
    district = SP(read=PR_READ, write=PR_UPDATE)
    external_id = SP(read=PR_READ, write=PR_UPDATE)
    status = SP(read=PR_READ, write=PR_UPDATE)

    def deserialize(self, *args, **kwargs):
        super(FoclStructSerializer, self).deserialize(*args, **kwargs)

        # object insert in db
        if not self.obj.id:
            self.create_focl_struct_content(self.obj)
            self.add_to_registry(self.obj)

    @classmethod
    def create_focl_struct_content(cls, focl_struct_obj):
        layers_template_path = os.path.join(BASE_PATH, 'layers_templates/')

        wfs_service = WfsService(parent=focl_struct_obj,
                                 owner_user=focl_struct_obj.owner_user,
                                 display_name='Сервис редактирования')

        web_map = WebMap(parent=focl_struct_obj,
                         owner_user=focl_struct_obj.owner_user,
                         display_name='Веб-карта ВОЛС')
        web_map.root_item = WebMapItem()
        web_map.root_item.item_type = 'root'
        web_map_items = []

        for vl_name in FOCL_LAYER_STRUCT:
            with codecs.open(os.path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                vector_layer = ModelsUtils.create_vector_layer(focl_struct_obj, json_layer_struct, vl_name)
                ModelsUtils.append_lyr_to_wfs(wfs_service, vector_layer, vl_name)
                mapserver_style = ModelsUtils.set_default_style(vector_layer, vl_name, 'default')
                web_map_items.append(
                    ModelsUtils.create_web_map_item(mapserver_style, json_layer_struct['resource']['display_name']))

        wfs_service.persist()

        # add inverted list of layers to webmap
        web_map_items.reverse()
        i = 1
        for item in web_map_items:
            item.position = i
            i += 1
            web_map.root_item.children.append(item)
            item.persist()

        web_map.persist()
        web_map.root_item.persist()

        # add real layers
        real_layers_template_path = os.path.join(BASE_PATH, 'real_layers_templates/')
        for vl_name in FOCL_REAL_LAYER_STRUCT:
            with codecs.open(os.path.join(real_layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                vector_layer = ModelsUtils.create_vector_layer(focl_struct_obj, json_layer_struct, vl_name)
                mapserver_style = ModelsUtils.set_default_style(vector_layer, vl_name, 'default')

    @classmethod
    def add_to_registry(cls, focl_struct_obj):
        co = ConstructObject()
        co.name = focl_struct_obj.display_name
        co.resource = focl_struct_obj
        co.project = ModelsUtils.get_project_by_resource(focl_struct_obj)
        co.persist()


class SituationPlan(Base, ResourceGroup):
    identity = 'situation_plan'
    cls_display_name = "Ситуационный план"

    region = db.Column(db.Unicode, nullable=True)  # Справочник, как слой: Регионы
    district = db.Column(db.Unicode, nullable=True)  # Справочник, как слой: Муниципальный район

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, FoclProject)


class SituationPlanSerializer(Serializer):
    identity = SituationPlan.identity
    resclass = SituationPlan

    def deserialize(self, *args, **kwargs):
        super(SituationPlanSerializer, self).deserialize(*args, **kwargs)

        # инсерт объекта в БД
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
        # wfs_layer.persist()

    @classmethod
    def create_web_map_item(cls, mapserver_style, display_name):
        map_item = WebMapItem()
        map_item.item_type = 'layer'
        map_item.display_name = display_name
        map_item.layer_enabled = True
        map_item.layer_adapter = ImageAdapter.identity
        map_item.style = mapserver_style
        return map_item

    @classmethod
    def set_default_style(cls, vector_layer, keyname, style_name):
        def_style_path = os.path.join(LAYERS_DEF_STYLES_PATH, keyname + '.xml')

        if not os.path.exists(def_style_path):
            return  # Need to set common point\line\polygon style

        # elem = etree.parse(def_style_path).getroot()
        # dst = qml.transform(elem)
        # mapserver_xml = etree.tostring(dst, pretty_print=True, encoding=unicode)

        with open(def_style_path) as f:
            mapserver_xml = f.read()

        ms = MapserverStyle(parent=vector_layer, owner_user=vector_layer.owner_user)
        ms.display_name = style_name
        ms.xml = mapserver_xml
        ms.persist()

        return ms

    @classmethod
    def get_project_by_resource(cls, resource):
        if '_project_cache' not in cls.__dict__.keys():
            db_session = DBSession()
            projects = db_session.query(Project).all()
            cls._project_cache = {project.root_resource_id: project for project in projects if
                                  project.root_resource_id is not None}

        res = resource
        while res:
            if res.id in cls._project_cache.keys():
                return cls._project_cache[res.id]
            res = res.parent

        return None


# ---- DOMAIN MODELS ----
class Region(Base):
    __tablename__ = 'region'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300))
    short_name = db.Column(db.Unicode(length=100), nullable=True)
    region_code = db.Column(db.Integer, nullable=True)


class District(Base):
    __tablename__ = 'district'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300))
    short_name = db.Column(db.Unicode(length=100), nullable=True)

    region_id = db.Column(db.Integer, ForeignKey(Region.id))

    region = relationship(Region)


class Project(Base):
    __tablename__ = 'project'
    __table_args__ = {'schema': 'compulink'}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(length=300))
    short_name = db.Column(db.Unicode(length=100), nullable=True)
    description = db.Column(db.UnicodeText, nullable=True)
    root_resource_id = db.Column(db.Integer, nullable=True)
    keyname = db.Column(db.Unicode(length=100), nullable=True, unique=True)

    root_resource = relationship(
        Resource,
        foreign_keys=[root_resource_id, ],
        primaryjoin=root_resource_id == Resource.id,
        lazy='joined'
    )


class ConstructObject(Base):
    __tablename__ = 'construct_object'
    __table_args__ = {'schema': 'compulink'}

    resource_id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    name = db.Column(db.Unicode(length=300))
    external_id = db.Column(db.Unicode(length=300), nullable=True)
    district_id = db.Column(db.Integer, ForeignKey(District.id), nullable=True)
    region_id = db.Column(db.Integer, ForeignKey(Region.id), nullable=True)
    project_id = db.Column(db.Integer, ForeignKey(Project.id), nullable=True)
    subcontr_name = db.Column(db.Unicode(length=300), nullable=True)
    start_build_date = db.Column(db.Date, nullable=True)
    end_build_date = db.Column(db.Date, nullable=True)
    start_deliver_date = db.Column(db.Date, nullable=True)
    end_deliver_date = db.Column(db.Date, nullable=True)
    cabling_plan = db.Column(db.Float)
    fosc_plan = db.Column(db.Integer, nullable=True)
    cross_plan = db.Column(db.Integer, nullable=True)
    spec_trans_plan = db.Column(db.Integer, nullable=True)
    access_point_plan = db.Column(db.Integer, nullable=True)

    resource = relationship(
        Resource,
        foreign_keys=[resource_id, ],
        primaryjoin=resource_id == Resource.id,
    )

    district = relationship(District)
    region = relationship(Region)

    project = relationship(Project)

    _internal_name_update = False

    @validates('name', include_backrefs=False)
    def update_name(self, key, name):
        if not ConstructObject._internal_name_update:
            session = DBSession
            focl_struct = session.query(FoclStruct).get(self.resource_id)
            focl_struct.display_name = name
        return name

    @event.listens_for(FoclStruct.display_name, 'set')
    def update_from_name(focl_struct, value, oldvalue, initiator):
        try:
            ConstructObject._internal_name_update = True
            session = DBSession

            const_obj = session.query(ConstructObject).filter(ConstructObject.resource_id == focl_struct.id).one()
            const_obj.name = value

            #report_line = session.query(ConstructionStatusReport).filter(ConstructionStatusReport.focl_res_id == focl_info.resource_id).one()
            #report_line.focl_name = focl_struct.display_name
        except:
            pass  # TODO
        finally:
            ConstructObject._internal_name_update = False


# ---- Metadata and scheme staff
def tometadata_event(self, metadata):
    result = db.Table.tometadata(self, metadata)
    event.listen(result, "before_create", db.DDL('CREATE SCHEMA IF NOT EXISTS compulink;'))
    return result


Region.__table__.tometadata = types.MethodType(tometadata_event, Region.__table__)
District.__table__.tometadata = types.MethodType(tometadata_event, District.__table__)
Project.__table__.tometadata = types.MethodType(tometadata_event, Project.__table__)
ConstructObject.__table__.tometadata = types.MethodType(tometadata_event, ConstructObject.__table__)
