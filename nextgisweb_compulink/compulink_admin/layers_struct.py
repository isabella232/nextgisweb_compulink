# -*- coding: utf-8 -*-
# Добавлять слои в обратном порядке,
# относительно того как они будут в толстом клиенте

FOCL_LAYER_STRUCT = [
    'other_polygon_object',
    'other_line_object',
    #'gas_pipeline',
    #'oil_pipeline',
    'overhead_power_line',
    'optical_cable',
    'other_point_object',
    'note',
    'cellular_station',
    'telecom_cabinet',
    'sump_canalization',
    'communication_center',
    'electrical_substation',
    'transmission_tower',
    'pole',
    'access_point',
    'fosc',
    'optical_cross',
    'endpoint',
]

SIT_PLAN_LAYER_STRUCT = [
    'sp_other_polygon_object',
    #'sp_boundary',
    'sp_other_line_object',
    #'sp_gas_pipeline',
    #'sp_oil_pipeline',
    'sp_overhead_power_line',
    'sp_focl',
    'sp_other_point_object',
    'sp_note',
    'sp_photo',
    #'sp_cellular_station',
    'sp_sump_canalization',
    'sp_communication_center',
    'sp_electrical_substation',
    'sp_access_point',
    'sp_fosc',
    'sp_optical_cross',
]

PROJECT_LAYER_STRUCT = [
]
