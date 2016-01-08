# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from ..model import *

regions_dgrid_viewmodel = [
    {
        'data-property': 'id',
        'grid-property': 'id',
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
            'sort-field': Region.name
        },
        'label': 'Регион',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    }
]