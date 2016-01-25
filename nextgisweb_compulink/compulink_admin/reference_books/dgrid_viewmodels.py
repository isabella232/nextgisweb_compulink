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
        'label': 'Наименование',
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
        'label': 'Наименование',
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
            'editorArgs': '[data]',
            'autoSave': True
        }
    }
]

projects_dgrid_viewmodel = [
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
        'label': 'Наименование',
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
        'data-property': 'description',
        'grid-property': 'description',
        'label': 'Описание',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'keyname',
        'grid-property': 'keyname',
        'label': 'Ключ',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'root_resource',
        'grid-property': 'root_resource',
        'relation': {
            'id': 'id',
            'label': 'display_name',
            'relation-field': Project.root_resource,
            'sort-field': Resource.display_name,
            'type': Resource
        },
        'label': 'Объект строительства',
        'cell-prop': {
            'editor': 'widget=>BuildingObjectsRelationSelect',
            'editorArgs': 'object=>{url: \'/compulink/reporting/resources/child\'}=end',
            'editOn': 'dblclick',
            'autoSave': True
        }
    }
]

construct_objects_dgrid_viewmodel = [
    {
        'data-property': 'resource_id',
        'grid-property': 'id',
        'id': True,
        'label': 'Идентификатор',
        'cell-prop': {

        }
    },
    {
        'data-property': 'name',
        'grid-property': 'name',
        'label': 'Наименование',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'start_build_date',
        'grid-property': 'start_build_date',
        'label': 'Начало СМР',
        'cell-prop': {
            'editor': 'widget=>DateTextBox',
            'editorArgs': 'object=>{selector:\'date\', constraints: {datePattern: \'dd.MM.yyyy\'}}=end',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'end_build_date',
        'grid-property': 'end_build_date',
        'label': 'Окончание СМР',
        'cell-prop': {
            'editor': 'widget=>DateTextBox',
            'editorArgs': 'object=>{selector:\'date\', constraints: {datePattern: \'dd.MM.yyyy\'}}=end',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'start_deliver_date',
        'grid-property': 'start_deliver_date',
        'label': 'Начало сдачи заказчику',
        'cell-prop': {
            'editor': 'widget=>DateTextBox',
            'editorArgs': 'object=>{selector:\'date\', constraints: {datePattern: \'dd.MM.yyyy\'}}=end',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'end_deliver_date',
        'grid-property': 'end_deliver_date',
        'label': 'Окончание сдачи заказчику',
        'cell-prop': {
            'editor': 'widget=>DateTextBox',
            'editorArgs': 'object=>{selector:\'date\', constraints: {datePattern: \'dd.MM.yyyy\'}}=end',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'cabling_plan',
        'grid-property': 'cabling_plan',
        'label': 'Плановая протяженность (км)',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'fosc_plan',
        'grid-property': 'fosc_plan',
        'label': 'Количество муфт (шт)',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'cross_plan',
        'grid-property': 'cross_plan',
        'label': 'Количество кроссов (шт)',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'spec_trans_plan',
        'grid-property': 'spec_trans_plan',
        'label': 'Количество спецпереходов (шт)',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    {
        'data-property': 'access_point_plan',
        'grid-property': 'access_point_plan',
        'label': 'Количество точек доступа (шт)',
        'cell-prop': {
            'editor': 'number',
            'editOn': 'dblclick',
            'autoSave': True
        }
    },
    # {
    #     'data-property': 'region',
    #     'grid-property': 'region',
    #     'relation': {
    #         'id': 'id',
    #         'label': 'name',
    #         'relation-field': ConstructObject.region,
    #         'sort-field': Region.name,
    #         'type': Region
    #     },
    #     'label': 'Субъект РФ',
    #     'cell-prop': {
    #         'editor': 'widget=>RelationSelect',
    #         'editOn': 'dblclick',
    #         'editorArgs': '[data]',
    #         'autoSave': True
    #     }
    # },
    {
        'complex': True,
        'label': 'Субъект РФ',
        'grid-property': 'region_complex',
        'sort-field': ConstructObject.region,
        'value': lambda reg, dist: (reg.name if reg else '') +
                                   (', ' + dist.name if dist else ''),
        'fields': [
            {
                'relation': True,
                'data-property': 'region',
                'id': 'id',
                'label': 'name',
                'relation-field': ConstructObject.region,
                'sort-field': Region.name,
                'type': Region
            },
            {
                'relation': True,
                'data-property': 'district',
                'id': 'id',
                'label': 'name',
                'relation-field': ConstructObject.district,
                'sort-field': District.name,
                'type': District
            }
        ],
        'cell-prop': {
            'editor': 'widget=>RegionSelect',
            'editOn': 'dblclick',
            'editorArgs': 'object=>{url: \'/compulink/regions/tree\'}=end',
            'autoSave': True
        }
    },
    {
        'data-property': 'project',
        'grid-property': 'project',
        'relation': {
            'id': 'id',
            'label': 'name',
            'relation-field': ConstructObject.project,
            'sort-field': Project.name,
            'type': Project
        },
        'label': 'Проект',
        'cell-prop': {
            'editor': 'widget=>RelationSelect',
            'editOn': 'dblclick',
            'editorArgs': '[data]',
            'autoSave': True
        }
    },
    {
        'data-property': 'subcontr_name',
        'grid-property': 'subcontr_name',
        'label': 'Субподрядчик',
        'cell-prop': {
            'editor': 'text',
            'editOn': 'dblclick',
            'autoSave': True
        }
    }

    # {
    #     'data-property': 'resource',
    #     'grid-property': 'resource',
    #     'relation': {
    #         'id': 'id',
    #         'label': 'display_name',
    #         'relation-field': ConstructObject.resource,
    #         'sort-field': Resource.display_name,
    #         'type': Resource
    #     },
    #     'label': 'Ссылка на ресурс',
    #     'cell-prop': {
    #         'editor': 'widget=>BuildingObjectsRelationSelect',
    #         'editorArgs': 'object=>{url: \'/compulink/reporting/resources/child\'}=end',
    #         'editOn': 'dblclick',
    #         'autoSave': True
    #     }
    # }
]