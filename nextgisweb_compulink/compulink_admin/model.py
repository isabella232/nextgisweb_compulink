# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
from lxml import etree
import uuid
import codecs
from nextgisweb import db

from nextgisweb.models import declarative_base, DBSession
from nextgisweb.auth.models import User
from nextgisweb.resource import (ResourceGroup, Serializer, DataStructureScope, DataScope, ResourceScope)
from nextgisweb.vector_layer.model import VectorLayer, TableInfo
from nextgisweb.webmap.adapter import ImageAdapter
from nextgisweb.webmap.model import WebMap, WebMapItem
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

PROJECT_STATUS_PROJECT = 'project'
PROJECT_STATUS_IN_PROGRESS = 'in_progress'
PROJECT_STATUS_FINISHED = 'finished'
PROJECT_STATUSES = (PROJECT_STATUS_PROJECT, PROJECT_STATUS_IN_PROGRESS, PROJECT_STATUS_FINISHED)

class FoclProject(Base, ResourceGroup):
    identity = 'focl_project'
    cls_display_name = "Проект"

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
    cls_display_name = "Объект строительства"

    region = db.Column(db.Unicode, nullable=True)  # Справочник, как слой: Регионы
    district = db.Column(db.Unicode, nullable=True)  # Справочник, как слой: Муниципальный район
    external_id = db.Column(db.Unicode, nullable=True)  # Внешний идентификатор
    status = db.Column(db.Enum(PROJECT_STATUSES, native_enum=False), default=PROJECT_STATUS_PROJECT, nullable=True)  # Статус (проект, идет строительство, построена)
    status_upd_user = db.Column(db.Boolean, default=False)  # Статус обновлен пользователем

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

        #инсерт объекта в БД
        if not self.obj.id:
            self.create_focl_struct_content(self.obj)

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

        for vl_name in FOCL_LAYER_STRUCT:
            with codecs.open(os.path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                json_layer_struct = json.load(json_file, encoding='utf-8')
                vector_layer = ModelsUtils.create_vector_layer(focl_struct_obj, json_layer_struct, vl_name)
                ModelsUtils.append_lyr_to_wfs(wfs_service, vector_layer, vl_name)
                mapserver_style = ModelsUtils.set_default_style(vector_layer, vl_name, 'default')
                ModelsUtils.append_lyr_to_web_map(web_map.root_item, mapserver_style, json_layer_struct['resource']['display_name'])

        wfs_service.persist()
        web_map.persist()
        web_map.root_item.persist()


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
    def append_lyr_to_web_map(cls, web_map_root_item, mapserver_style, display_name):
        map_item = WebMapItem()
        map_item.item_type = 'layer'
        map_item.display_name = display_name
        map_item.layer_enabled = True
        map_item.layer_adapter = ImageAdapter.identity
        map_item.style = mapserver_style

        web_map_root_item.children.append(map_item)
        map_item.persist()


    @classmethod
    def set_default_style(cls, vector_layer, keyname, style_name):
        def_style_path = os.path.join(LAYERS_DEF_STYLES_PATH, keyname+'.xml')

        if not os.path.exists(def_style_path):
            return  # Need to set common point\line\polygon style

        #elem = etree.parse(def_style_path).getroot()
        #dst = qml.transform(elem)
        #mapserver_xml = etree.tostring(dst, pretty_print=True, encoding=unicode)

        with open(def_style_path) as f:
            mapserver_xml = f.read()

        ms = MapserverStyle(parent=vector_layer, owner_user=vector_layer.owner_user)
        ms.display_name = style_name
        ms.xml = mapserver_xml
        ms.persist()

        return ms


