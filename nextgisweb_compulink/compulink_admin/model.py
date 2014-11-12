# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import logging
from nextgisweb.auth import User

from nextgisweb.models import declarative_base
from nextgisweb.resource import (
    Resource,
    DataStructureScope,
    DataScope, ResourceGroup)
from sqlalchemy.orm import MapperExtension


Base = declarative_base()


class FoclProject(Base, ResourceGroup):
    identity = 'focl_project'
    cls_display_name = "Проект строительства ВОЛС"

    __scope__ = (DataStructureScope, DataScope)

    class OnInitExtension(MapperExtension):
        def after_insert(self, mapper, connection, instance):
            pass

    @classmethod
    def check_parent(self, parent):
        #tree review for unsupported parents
        parent_temp = parent
        while parent_temp:
            for unsupported_res in [FoclProject, FoclStruct, SituationPlan]:
                if isinstance(parent_temp, unsupported_res):
                    return False
            parent_temp = parent_temp.parent
        return isinstance(parent, ResourceGroup)



class FoclStruct(Base, ResourceGroup):
    identity = 'focl_struct'
    cls_display_name = "Структура ВОЛС"

    __scope__ = (DataStructureScope, DataScope)

    class OnInitExtension(MapperExtension):
        def after_insert(self, mapper, connection, instance):
            pass

    @classmethod
    def check_parent(self, parent):
        return isinstance(parent, FoclProject)


class SituationPlan(Base, ResourceGroup):
    identity = 'situation_plan'
    cls_display_name = "Ситуационный план"

    __scope__ = (DataStructureScope, DataScope)

    class OnInitExtension(MapperExtension):
        def after_insert(self, mapper, connection, instance):
            adminusr = User.filter_by(keyname='administrator').one()
            obj = ResourceGroup(parent_id=instance.id, owner_user=adminusr,
                                display_name="АвтоГруппа")
            obj.persist()

    __mapper_args__ = {'extension': OnInitExtension()}

    @classmethod
    def check_parent(self, parent):
        return isinstance(parent, FoclProject)