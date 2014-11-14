# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
import uuid

from nextgisweb.models import declarative_base
from nextgisweb.resource import (ResourceGroup, Serializer)
from nextgisweb.vector_layer.model import VectorLayer
from nextgisweb_rekod.file_bucket.model import FileBucket, os

from nextgisweb_compulink.compulink_admin.layers_struct import FOCL_LAYER_STRUCT, SIT_PLAN_LAYER_STRUCT


Base = declarative_base()


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
            doc_res = FileBucket(parent=self.obj, owner_user=self.obj.owner_user,
                                 display_name="Документы")
            doc_res.persist()


class FoclStruct(Base, ResourceGroup):
    identity = 'focl_struct'
    cls_display_name = "Структура ВОЛС"

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, FoclProject)


class FoclStructSerializer(Serializer):
    identity = FoclStruct.identity
    resclass = FoclStruct

    def deserialize(self, *args, **kwargs):
        super(FoclStructSerializer, self).deserialize(*args, **kwargs)

        #инсерт объекта в БД
        if not self.obj.id:
            base_path = os.path.abspath(os.path.dirname(__file__))
            layers_template_path = os.path.join(base_path, 'layers_templates/')
            from nextgisweb.resource.serialize import CompositeSerializer
            import codecs
            for vl_name, geom_type in FOCL_LAYER_STRUCT:
                with codecs.open(os.path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                    data_str = json.load(json_file, encoding='utf-8')
                    vl = VectorLayer(parent=self.obj, owner_user=self.obj.owner_user)
                    cs = CompositeSerializer(vl, self.obj.owner_user, data_str)
                    cs.deserialize()

                    vl.tbl_uuid = uuid.uuid4().hex
                    vl.geometry_type = geom_type
                    vl.keyname = '%s_%s' % (vl_name, vl.tbl_uuid)

                    vl.persist()
                #TODO: add style to layer


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
            base_path = os.path.abspath(os.path.dirname(__file__))
            layers_template_path = os.path.join(base_path, 'situation_layers_templates/')
            from nextgisweb.resource.serialize import CompositeSerializer
            import codecs
            for vl_name, geom_type in SIT_PLAN_LAYER_STRUCT:
                with codecs.open(os.path.join(layers_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                    data_str = json.load(json_file, encoding='utf-8')
                    vl = VectorLayer(parent=self.obj, owner_user=self.obj.owner_user)
                    cs = CompositeSerializer(vl, self.obj.owner_user, data_str)
                    cs.deserialize()

                    vl.tbl_uuid = uuid.uuid4().hex
                    vl.geometry_type = geom_type
                    vl.keyname = '%s_%s' % (vl_name, vl.tbl_uuid)

                    vl.persist()
                #TODO: add style to layer
