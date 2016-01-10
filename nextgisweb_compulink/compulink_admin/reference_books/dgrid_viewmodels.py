# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from ..model import *
from nextgisweb.resource.model import Resource

regions_dgrid_viewmodel = [
    {
        'data-property': 'id',
        'grid-property': 'id',
        'id': True,
        'label': 'Идентификатор',
        'cell-prop': {

        }
    },
    {
        'data-property': 'name',
        'grid-property': 'name',
        'label': 'Название',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'short_name',
        'grid-property': 'short_name',
        'label': 'Краткое название',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'region_code',
        'grid-property': 'region_code',
        'label': 'Код региона',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    }
]

districts_dgrid_viewmodel = [
    {
        'data-property': 'id',
        'grid-property': 'id',
        'id': True,
        'label': 'Идентификатор',
        'cell-prop': {

        }
    },
    {
        'data-property': 'name',
        'grid-property': 'name',
        'label': 'Название',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'short_name',
        'grid-property': 'short_name',
        'label': 'Краткое название',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'region',
        'grid-property': 'region',
        'relation': {
            'id': 'id',
            'label': 'name',
            'relation-field': District.region,
            'sort-field': Region.name,
            'type': Region
        },
        'label': 'Регион',
        'cell-prop': {
            'editor': 'widget=>RelationSelect',
            'editOn': 'dblclick',
            'autoSave': True
        }
    }
]

