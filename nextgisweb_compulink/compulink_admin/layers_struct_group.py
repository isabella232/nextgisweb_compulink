# -*- coding: utf-8 -*-
# Добавлять слои в обратном порядке,
# относительно того как они будут в толстом клиенте

FOCL_LAYER_STRUCT = [
    'note',
    'special_transition',
    'optical_cable',
    'fosc',
    'optical_cross',
    'access_point',
    'endpoint',
]

OBJECTS_LAYER_STRUCT = [
    'transmission_tower',
    'sump_canalization',
]

FOCL_REAL_LAYER_STRUCT = [
    'real_special_transition',
    'real_optical_cable',
    'real_special_transition_point',
    'real_optical_cable_point',
    'real_fosc',
    'real_optical_cross',
    'real_access_point',
]

ACTUAL_FOCL_REAL_LAYER_STRUCT = [
    'actual_real_special_transition',
    'actual_real_optical_cable',
    'actual_real_special_transition_point',
    'actual_real_optical_cable_point',
    'actual_real_fosc',
    'actual_real_optical_cross',
    'actual_real_access_point',
]


SIT_PLAN_LAYER_STRUCT = [
    'sp_other_polygon_object',
    'sp_other_line_object',
    'sp_overhead_power_line',
    'sp_focl',
    'sp_other_point_object',
    'sp_note',
    'sp_sump_canalization',
    'sp_communication_center',
    'sp_electrical_substation',
    'sp_access_point',
    'sp_fosc',
    'sp_optical_cross',
]

PROJECT_LAYER_STRUCT = [
]
