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

        label_plan = u'проектные'
        label_fact = u'построенные'


        #Start draw
        current_h = 10
        caption = u'Точки доступа'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((50, current_h+20), label_plan, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('access_point', 0, 20, 20)
        background.paste(plan_img, (18, current_h+15))

        drawer.text((155, current_h+20), label_fact, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_access_point', 0, 20, 20)
        background.paste(fact_img, (123, current_h+15))

        current_h += 50
        caption = u'Оптические кроссы'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((50, current_h+20), label_plan, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('optical_cross', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((155, current_h+20), label_fact, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_optical_cross', 0, 16, 16)
        background.paste(fact_img, (125, current_h+18))


        current_h += 50
        caption = u'Оптические муфты'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((50, current_h+20), label_plan, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('fosc', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((155, current_h+20), label_fact, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_fosc', 0, 16, 16)
        background.paste(fact_img, (125, current_h+18))

        current_h += 50
        caption = u'Трасса оптического кабеля'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((100, current_h+15), label_plan, font=label_font, fill=(0, 0, 0, 255))
        drawer.text((170, current_h+15), label_fact, font=label_font, fill=(0, 0, 0, 255))

        classes = {0: u'В грунте', 1:u'На опоре ЛЭП', 2:u'В каб. канализации', 3:u'В здании', 4:u'Прочее'}
        for lay_ind, lay_name in classes.items():
            drawer.text((10, current_h + 15 + (lay_ind + 1)*11), lay_name, font=label_font, fill=(0, 0, 0, 255))

            plan_img = self.legend_img_from_style('optical_cable', lay_ind, 40, 10)
            background.paste(plan_img, (110, current_h + 15 + (lay_ind + 1)*11))

            fact_img = self.legend_img_from_style('real_optical_cable', lay_ind, 40, 10)
            background.paste(fact_img, (185, current_h + 15 + (lay_ind + 1)*11))

        current_h += 100
        caption = u'Спецпереходы'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((50, current_h+20), label_plan, font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('special_transition', 0, 40, 10)
        background.paste(plan_img, (5, current_h+20))

        drawer.text((155, current_h+20), label_fact, font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('real_special_transition', 0, 40, 10)
        background.paste(fact_img, (110, current_h+20))
        background.save(out_path)

        current_h += 50
        caption = u'Объекты размещения'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), u'Колодцы Каб. кан.', font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('transmission_tower', 0, 16, 16) #sump_canalization
        background.paste(plan_img, (20, current_h+18))

        drawer.text((160, current_h+20), u'Опоры ВЛ', font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('transmission_tower', 0, 16, 16)
        background.paste(fact_img, (140, current_h+18))
        background.save(out_path)


        current_h += 50
        caption = u'Точки А-Б'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((60, current_h+35), u'Точка А', font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('endpoint', 0, 36, 96)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((180, current_h+35), u'Точка Б', font=label_font, fill=(0, 0, 0, 255))
        fact_img = self.legend_img_from_style('endpoint', 1, 36, 96)
        background.paste(fact_img, (140, current_h+18))
        background.save(out_path)


        current_h += 80
        caption = u'Отметки'
        self.draw_center_text(drawer, caption, caption_font, max_x, current_h)
        drawer.text((40, current_h+20), u'Трассы ОК', font=label_font, fill=(0, 0, 0, 255))
        plan_img = self.legend_img_from_style('real_optical_cable_point', 0, 16, 16)
        background.paste(plan_img, (20, current_h+18))

        drawer.text((160, current_h+20), u'Спецпереходов', font=label_font, fill=(0, 0, 0, 255))
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

        mapf_map = Map().from_xml(emap)
        mapfile(mapf_map, buf)
        mapobj = mapscript.fromstring(buf.getvalue())
        layerobj = mapobj.getLayer(0)
        classobj = layerobj.getClass(subclass)
        gdimg = classobj.createLegendIcon(mapobj, layerobj, w, h)

        mem_png = StringIO(gdimg.saveToString())
        img = Image.open(mem_png)

        return img




# offset
# from PIL import Image
# img = Image.open('/pathto/file', 'r')
# img_w, img_h = img.size
# background = Image.new('RGBA', (1440, 900), (255, 255, 255, 255))
# bg_w, bg_h = background.size
# offset = ((bg_w - img_w) / 2, (bg_h - img_h) / 2)
# background.paste(img, offset)
# background.save('out.png')
