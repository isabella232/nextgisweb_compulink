# -*- coding: utf-8 -*-
from sqlalchemy.orm import joinedload_all
import transaction
from nextgisweb_mapserver.model import MapserverStyle
from os import path, listdir
from nextgisweb import DBSession
from nextgisweb.command import Command

BASE_PATH = path.abspath(path.dirname(__file__))
LAYERS_DEF_STYLES_PATH = path.join(BASE_PATH, path.pardir, 'compulink_admin/', 'layers_default_styles/')

@Command.registry.register
class UpdateStylesCommand():
    identity = 'compulink.update_styles'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        styles = cls.read_styles()
        cls.update_all_styles(styles)


    @classmethod
    def read_styles(cls):
        styles = {}
        for f in listdir(LAYERS_DEF_STYLES_PATH):
            if f.endswith(".xml"):
                style_name = path.splitext(f)[0]
                with open(path.join(LAYERS_DEF_STYLES_PATH, f)) as xml_f:
                    mapserver_xml = xml_f.read()
                styles[style_name] = mapserver_xml
        return styles


    @classmethod
    def update_all_styles(cls, new_styles):
        dbsession = DBSession()

        ms_styles_resources = dbsession.query(MapserverStyle).options(joinedload_all('parent')).all()

        for ms_style_res in ms_styles_resources:
            vector_layer_key = ms_style_res.parent.keyname
            updated = False
            for style_name in new_styles.keys():
                if style_name in vector_layer_key:
                    ms_style_res.xml = new_styles[style_name]
                    ms_style_res.persist()
                    print "%s was updated!" % vector_layer_key
                    updated = True
                    break
            if not updated:
                print "%s for %s was not updated!" % (ms_style_res.display_name, vector_layer_key)
        transaction.manager.commit()
        dbsession.close()













