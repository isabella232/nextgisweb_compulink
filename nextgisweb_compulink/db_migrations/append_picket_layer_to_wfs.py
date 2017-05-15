import json

import codecs
import os
import transaction

from nextgisweb import DBSession
from nextgisweb.wfsserver.model import Service as WfsServiceResource
from nextgisweb_compulink.compulink_admin.model import ModelsUtils, FoclStruct, BASE_PATH

def append_picket_layer_to_wfs(args):
    db_session = DBSession()

    transaction.manager.begin()

    fs_resources = db_session.query(FoclStruct).all()

    # get struct from
    template_path = os.path.join(BASE_PATH, 'layers_templates/')

    vl_name = 'picket'

    for fs in fs_resources:
        # get picket layer
        picket_layer = [res for res in fs.children if res.keyname and vl_name in res.keyname]

        if picket_layer:
            # get wfs service
            wfs_services = [res for res in fs.children if res.cls == WfsServiceResource.identity]

            if wfs_services:
                for wfs_service in wfs_services:
                    ModelsUtils.append_lyr_to_wfs(wfs_service, picket_layer[0], vl_name)
                    #wfs_service.persist()

            print 'Focl struct %s. Added to wfs service: %s' % (fs.display_name, vl_name)

    transaction.manager.commit()
    db_session.close()
