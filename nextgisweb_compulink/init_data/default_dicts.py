# -*- coding: utf-8 -*-

DEFAULT_COMPULINK_DICTS = {
    'status_built': {
        'display_name': 'Статус строительства объекта',
        'items': {
            'project': 'Проект',
            'built': 'Построен'
        }
    },
    'status_check': {
        'display_name': 'Статус проверки',
        'items': {
            'not_checked': 'Не проверен',
            'checked': 'Проверен'
        }

    },
    'laying_method': {
        'display_name': 'Способ прокладки',
        'items': {
            'transmission_towers': 'На опоре ЛЭП',
            'ground': 'В грунте',
            'canalization': 'В кабельной канализации',
            'building': 'В здании',
            'other': 'Прочее'
        }
    },
    'special_laying_method': {
        'display_name': 'Способ прокладки кабеля',
        'items': {
            'hdd': 'ГНБ',
            'towers': 'На опорах',
            'bottom': 'По дну водоема'
        }
    },
    'special_laying_number': {
        'display_name': 'Точка входа/выхода',
        'items': {
            'entrance': 'Вход',
            'exit': 'Выход'
        }
    },
    'fosc_placement': {
        'display_name': 'Места размещения оптических муфт',
        'items': {
            'room': 'В здании',
            'well': 'В кабельной канализации',
            'ground': 'В грунте',
            'pylon': 'На столбе, опоре',
            'other': 'Прочее'
        }
    },
    'voltage': {
        'display_name': 'Напряжение',
        'items': {
            '0.4': '0,4 кВ',
            '6-10': '6-10 кВ',
            '35': '35 кВ',
            '110': '110 кВ'
        }
    },
    'voltage_values': {
        'display_name': 'Напряжения подстанции',
        'items': {
            '110/35': '110/35 кВ',
            '110/35/10': '110/35/10(6) кВ',
            '35/10': '35/10(6) кВ',
            '35/0.4': '35/0,4 кВ',
            '10/0.4': '10(6)/0,4 кВ'
        }
    },
    'type_fosc': {
        'display_name': 'Тип муфты',
        'items': {
            'union': 'Соединительная',
            'separate': 'Разветвительная'
        }
    },
    'type_optical_cross': {
        'display_name': 'Тип кросса',
        'items': {
        }
    },
    'type_tower': {
        'display_name': 'Тип опоры ВЛ',
        'items': {
            'transitional': 'Промежуточная',
            'anchor': 'Анкерная',
            'solder': 'Отпаечная',
            'end': 'Концевая',
            'portal': 'Портальная',
            'transpositional': 'Транспозиционная'

        }
    },
    'type_pole': {
        'display_name': 'Тип столба',
        'items': {
        }
    },
    'material_pole': {
        'display_name': 'Материал столба',
        'items': {
            'ferroconcrete': 'Железобетонный',
            'steel pipe': 'Стальная труба',
        }
    },

    'type_ate': {
        'display_name': 'Вид АТЕ',
        'items': {
            'federal district': 'Федеральный округ',
            'region': 'Регион',
            'municipal district': 'Муниципальный район',
        }
    },

    #???

    'existing': {
        'display_name': 'Статус объекта',
        'items': {
            'projected': 'Проектируемый(ая)',
            'existing': 'Существующий(ая)'
        }
    },

    'type_endpoint': {
        'display_name': 'Тип конечной точки',
        'items': {
            'point_a': 'Точка А',
            'point_b': 'Точка Б'
        }
    },



}