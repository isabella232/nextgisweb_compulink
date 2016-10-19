import json

import codecs
import os
import transaction

from nextgisweb import DBSession
from nextgisweb_compulink.compulink_admin.model import ModelsUtils, FoclStruct, BASE_PATH

def append_accepted_part_layer(args):
    db_session = DBSession()

    transaction.manager.begin()

    fs_resources = db_session.query(FoclStruct).all()

    # get struct from
    additional_template_path = os.path.join(BASE_PATH, 'additional_layers_templates/')

    vl_name = 'accepted_part'

    for fs in fs_resources:
        fs_children_keys = [res.keyname for res in fs.children if res.keyname]

        # check exists
        found = [res_key for res_key in fs_children_keys if vl_name in res_key]
        if not found:
            try:
                with codecs.open(os.path.join(additional_template_path, vl_name + '.json'), encoding='utf-8') as json_file:
                    json_layer_struct = json.load(json_file, encoding='utf-8')
                    vector_layer = ModelsUtils.create_vector_layer(fs, json_layer_struct, vl_name)
                    mapserver_style = ModelsUtils.set_default_style(vector_layer, vl_name, 'default')
            except Exception, ex:
                print 'Error on append layer %s to %s: %s' % (vl_name, fs.display_name, ex.message)
                return
            print 'Focl struct %s. Added: %s' % (fs.display_name, vl_name)

    transaction.manager.commit()
    db_session.close()
