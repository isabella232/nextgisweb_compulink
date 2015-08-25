# coding=utf-8
import codecs
from os import path

__author__ = 'yellow'
__license__ = ''
__date__ = '2014'
from PIL import Image, ImageDraw, ImageFont
import mapscript

from lxml import etree
from lxml.builder import ElementMaker
from StringIO import StringIO
from pkg_resources import resource_filename

from nextgisweb_mapserver.mapfile.util import mapfile
from nextgisweb_mapserver.mapfile import Map
from nextgisweb.marker_library import Marker

BASE_PATH = path.abspath(path.dirname(__file__))
LAYERS_DEF_STYLES_PATH = path.join(BASE_PATH, path.pardir, 'compulink_admin/', 'layers_default_styles/')


class LegendGenerator:

    def __init__(self, env):
        self.env = env

    def generate(self, out_path):
        #LAYOUT
        max_x = 243
        max_y = 500

        #Objs
        background = Image.new('RGBA', (max_x, max_y), (255, 255, 255, 255))
        drawer = ImageDraw.Draw(background)
        caption_font = ImageFont.truetype('LiberationSans-Regular.ttf', 12)
        label_font = ImageFont.truetype('LiberationSans-Regular.ttf', 10)

        label_plan_m = u'проектируемый'
        label_plan_w = u'проектируемая'
        label_fact_m = u'построенный'
        label_fact_w = u'построенная'


        #Start draw
        current_h = 10
        caption = u'Точка доступа'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), label_plan_w, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('access_point', 0, 20, 20)
        background.paste(plan_img, (18, current_h+15))

        drawer.text((155, current_h+20), label_fact_w, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_access_point', 0, 20, 20)
        background.paste(fact_img, (133, current_h+15))

        current_h += 50
        caption = u'Оптический кросс'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), label_plan_m, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('optical_cross', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((155, current_h+20), label_fact_m, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_optical_cross', 0, 16, 16)
        background.paste(fact_img, (135, current_h+18))


        current_h += 50
        caption = u'Оптическая муфта'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), label_plan_w, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('fosc', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((155, current_h+20), label_fact_w, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_fosc', 0, 16, 16)
        background.paste(fact_img, (135, current_h+18))

        current_h += 50
        caption = u'Трасса оптического кабеля'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((90, current_h+15), label_plan_w, font=label_font, fill=(0, 0, 0, 255))
        drawer.text((170, current_h+15), label_fact_w, font=label_font, fill=(0, 0, 0, 255))

        classes = {0: u'В грунте', 1:u'На опорах ЛЭП', 2:u'В каб. канализации', 3:u'В здании', 4:u'Прочее'}
        for lay_ind, lay_name in classes.items():
            drawer.text((10, current_h + 15 + (lay_ind + 1)*11), lay_name, font=label_font, fill=(0, 0, 0, 255))

            plan_img = self.legend_img_from_style('optical_cable', lay_ind, 40, 10)
            background.paste(plan_img, (110, current_h + 15 + (lay_ind + 1)*11))

            fact_img = self.legend_img_from_style('real_optical_cable', lay_ind, 40, 10)
            background.paste(fact_img, (185, current_h + 15 + (lay_ind + 1)*11))

        current_h += 100
        caption = u'Спецпереход'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((47, current_h+20), label_plan_m, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('special_transition', 0, 40, 10)
        background.paste(plan_img, (5, current_h+20))

        drawer.text((170, current_h+20), label_fact_m, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_special_transition', 0, 40, 10)
        background.paste(fact_img, (127, current_h+20))
        background.save(out_path)

        current_h += 50
        caption = u'Объекты размещения'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), u'Колодец Каб. кан.', font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('sump_canalization', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((160, current_h+20), u'Опора ВЛ', font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('transmission_tower', 0, 16, 16)
        background.paste(fact_img, (140, current_h+18))
        background.save(out_path)


        current_h += 50
        caption = u'Начальная и конечная точки трассы'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((60, current_h+35), u'Начальная\n точка', font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('endpoint', 0, 36, 96)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((180, current_h+35), u'Конечная\n точка', font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('endpoint', 1, 36, 96)
        background.paste(fact_img, (140, current_h+18))
        background.save(out_path)


        current_h += 80
        caption = u'Отметки'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), u'Точка трассы ОК', font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('real_optical_cable_point', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((160, current_h+20), u'Точка входа\n (выхода)\n спецперехода', font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_special_transition_point', 0, 16, 16)
        background.paste(fact_img, (140, current_h+18))
        background.save(out_path)



    def draw_center_text(self, drawer, any_text, font, max_x, height):
        w, h = drawer.textsize(any_text, font=font)
        drawer.text(((max_x - w) / 2, height), any_text, font=font, fill=(0, 0, 0, 255))

    def legend_img_from_style(self, style_name, subclass, w, h):
        with codecs.open(path.join(LAYERS_DEF_STYLES_PATH, style_name + '.xml'), encoding='utf-8') as style_file:
            map_xml = style_file.read()

        E = ElementMaker()
        buf = StringIO()
        emap = etree.fromstring(map_xml)
        esymbolset = E.symbolset(resource_filename('nextgisweb_mapserver', 'symbolset'))
        emap.insert(0, esymbolset)


        # PIXMAP и SVG маркеры
        for type_elem in emap.iterfind('./symbol/type'):
            if type_elem.text not in ('pixmap', 'svg'):
                continue
            symbol = type_elem.getparent()
            image = symbol.find('./image')
            marker = Marker.filter_by(keyname=image.text).one()
            image.text = self.env.file_storage.filename(marker.fileobj)

        # FONTS
        fonts_e = E.fontset(self.env.mapserver.settings['fontset'])
        emap.insert(0, fonts_e)

        mapf_map = Map().from_xml(emap)
        mapfile(mapf_map, buf)
        mapobj = mapscript.fromstring(buf.getvalue().encode('utf-8'))
        layerobj = mapobj.getLayer(0)
        classobj = layerobj.getClass(subclass)
        gdimg = classobj.createLegendIcon(mapobj, layerobj, w, h)

        mem_png = StringIO(gdimg.saveToString())
        img = Image.open(mem_png)

        return img
