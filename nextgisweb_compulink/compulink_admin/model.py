# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from nextgisweb.models import declarative_base
from nextgisweb.resource import (
    DataStructureScope,
    DataScope, ResourceGroup, Serializer)


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
            test_group = ResourceGroup(parent=self.obj, owner_user=self.obj.owner_user,
                                display_name="АвтоГруппа")
            test_group.persist()


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
            test_group = ResourceGroup(parent=self.obj, owner_user=self.obj.owner_user,
                                display_name="АвтоГруппа")
            test_group.persist()


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
            test_group = ResourceGroup(parent=self.obj, owner_user=self.obj.owner_user,
                                display_name="АвтоГруппа")
            test_group.persist()
