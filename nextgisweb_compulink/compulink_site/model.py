# -*- coding: utf-8 -*-
from .. import db
from ..models import declarative_base
from ..resource import (
    Resource,
    Scope,
    Permission,
    ResourceScope,
    Serializer,
    SerializedProperty as SP,
    SerializedResourceRelationship as SRR,
    ResourceGroup)

Base = declarative_base()


class ConstructControlWebMapScope(Scope):
    identity = 'webmap'
    label = u"Веб-карта"

    display = Permission(u"Просмотр")


class ConstructControlWebMap(Base, Resource):
    identity = 'webmap'
    cls_display_name = u"Веб-карта"

    __scope__ = ConstructControlWebMapScope

    root_item_id = db.Column(db.ForeignKey('webmap_item.id'), nullable=False)
    bookmark_resource_id = db.Column(db.ForeignKey(Resource.id), nullable=True)

    extent_left = db.Column(db.Float, default=-180)
    extent_right = db.Column(db.Float, default=+180)
    extent_bottom = db.Column(db.Float, default=-90)
    extent_top = db.Column(db.Float, default=+90)

    bookmark_resource = db.relationship(
        Resource, foreign_keys=bookmark_resource_id)

    root_item = db.relationship('WebMapItem', cascade='all')

    def to_dict(self):
        return dict(
            id=self.id,
            display_name=self.display_name,
            root_item=self.root_item.to_dict(),
            bookmark_resource_id=self.bookmark_resource_id,
            extent=(self.extent_left, self.extent_bottom,
                    self.extent_right, self.extent_top),
        )

    def from_dict(self, data):
        if 'display_name' in data:
            self.display_name = data['display_name']

        if 'root_item' in data:
            self.root_item = WebMapItem(item_type='root')
            self.root_item.from_dict(data['root_item'])

        if 'bookmark_resource_id' in data:
            self.bookmark_resource_id = data['bookmark_resource_id']

        if 'extent' in data:
            self.extent_left, self.extent_bottom, \
                self.extent_right, self.extent_top = data['extent']

