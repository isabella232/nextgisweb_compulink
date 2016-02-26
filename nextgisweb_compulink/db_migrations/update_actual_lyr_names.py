# coding=utf-8
import json

import codecs

import os
import transaction
from nextgisweb import DBSession
from nextgisweb.vector_layer import VectorLayer
from nextgisweb_compulink.compulink_admin.model import BASE_PATH


def update_actual_lyr_names(args):
    db_session = DBSession()
    transaction.manager.begin()

    # what update
    upd_real_layers = ['real_access_point', 'real_fosc', 'real_optical_cable', 'real_optical_cable_point',
                       'real_optical_cross', 'real_special_transition', 'real_special_transition_point']
    upd_real_lyr_names = {}

    # new names (already in templates!)
    real_layers_template_path = os.path.join(BASE_PATH, 'real_layers_templates/')
    for up_lyr_name in upd_real_layers:
        with codecs.open(os.path.join(real_layers_template_path, up_lyr_name + '.json'), encoding='utf-8') as json_file:
            json_layer_struct = json.load(json_file, encoding='utf-8')
            new_name = json_layer_struct['resource']['display_name']
            upd_real_lyr_names[up_lyr_name] = new_name

    # update now
    resources = db_session.query(VectorLayer).filter(VectorLayer.keyname.like('real_%')).all()

    for vec_layer in resources:
        lyr_name = vec_layer.keyname
        if not lyr_name:
            continue

        for up_lyr_name in upd_real_lyr_names.keys():
            if lyr_name.startswith(up_lyr_name) and not lyr_name.startswith(up_lyr_name + '_point'):  # ugly!
                vec_layer.display_name = upd_real_lyr_names[up_lyr_name]
                print '%s updated' % lyr_name
                break

    transaction.manager.commit()
    db_session.close()
