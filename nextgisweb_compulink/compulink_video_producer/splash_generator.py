# coding=utf-8
import os
from datetime import date

from PIL import Image, ImageDraw, ImageFont
from babel.dates import format_date


class SplashGenerator:
    # SS = Start Splash     ES = End Splash
    SS_BG_COLOR = '#3bb1e1'
    SS_FONT_NAME = 'Roboto-Regular.ttf'

    SS_TITLE_FONT_SIZE_RATIO = 0.035
    SS_TITLE_SPASING_FS_RATIO = 0.5
    SS_TITLE_FONT_COLOR = '#dcf1fa'
    SS_TITLE_POSITION_REL = (0.1, 0.21667)

    SS_DATE_FONT_SIZE_RATIO = 0.025
    SS_DATE_FONT_COLOR = '#afe0f7'
    SS_DATE_POSITION_REL_TITLE_RATIO_FS = (0, 1.5)

    SS_LOGO_POSITION_REL = (0, 0.042)
    SS_LOGO_WIDTH_RATIO = 0.2375
    SS_LOGO_FILE = 'compulink-logo-black.png'

    ES_BG_COLOR = '#ffffff'
    ES_LOGO_FILE = 'compulink-final-pic.png'
    ES_LOGO_WIDTH_RATIO = 0.3569


# Ширина блока с текстом - 62% от ширины экрана

    @classmethod
    def get_title(cls, context):
        title = u'Ход строительства объекта\n«%s»' % context.obj_name
        # if title[-1] == title[-2] == '"':
        #     title = title[:-1]
        return title

    @classmethod
    def get_date(cls, context):
        d = date.today()
        d_str = format_date(d, 'd MMMM YYYY', locale='ru')
        return d_str

    @classmethod
    def get_dates(cls, context):
        start_date, end_date = context.build_dates
        if not start_date or not end_date:
            return ''
        start_date_str = format_date(start_date, 'd MMMM YYYY', locale='ru')
        end_date_str = format_date(end_date, 'd MMMM YYYY', locale='ru')
        return u'%s  -  %s' % (start_date_str, end_date_str)

    @classmethod
    def get_img_path(cls, subpath):
        curr_path = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(curr_path, 'art', subpath)
        return full_path

    @classmethod
    def generate_start_splash(cls, context):
        # create canvas and draw
        img_size = (context.video_opt.width, context.video_opt.height)
        splash_img = Image.new('RGBA', img_size, cls.SS_BG_COLOR)
        drw = ImageDraw.Draw(splash_img)
        # draw title
        title = cls.get_title(context)
        title_font = ImageFont.truetype(cls.SS_FONT_NAME, int(cls.SS_TITLE_FONT_SIZE_RATIO * splash_img.width))
        title_pos = (splash_img.width * cls.SS_TITLE_POSITION_REL[0], splash_img.height * cls.SS_TITLE_POSITION_REL[1])
        title_spacing = title_font.size * cls.SS_TITLE_SPASING_FS_RATIO
        drw.multiline_text(
            title_pos,
            title,
            fill=cls.SS_TITLE_FONT_COLOR,
            font=title_font,
            spacing=title_spacing
        )
        # draw date
        date_str = cls.get_dates(context)
        date_font = ImageFont.truetype(cls.SS_FONT_NAME, int(cls.SS_DATE_FONT_SIZE_RATIO * splash_img.width))
        date_pos = (
            title_pos[0] + title_font.size * cls.SS_DATE_POSITION_REL_TITLE_RATIO_FS[0],
            title_pos[1] + title_font.size * cls.SS_DATE_POSITION_REL_TITLE_RATIO_FS[1] + drw.multiline_textsize(title, title_font, title_spacing)[1]
        )
        drw.text(
            date_pos,
            date_str,
            fill=cls.SS_DATE_FONT_COLOR,
            font=date_font)
        # draw logo
        logo_img = Image.open(cls.get_img_path(cls.SS_LOGO_FILE))
        new_size_x = cls.SS_LOGO_WIDTH_RATIO * splash_img.width
        new_size_y = logo_img.height * (new_size_x/logo_img.width)
        logo_img = logo_img.resize((int(new_size_x), int(new_size_y)), Image.ANTIALIAS)
        x = splash_img.width - logo_img.width - cls.SS_LOGO_POSITION_REL[0] * splash_img.width
        y = splash_img.height - logo_img.height - cls.SS_LOGO_POSITION_REL[1] * splash_img.height
        splash_img.paste(logo_img, (int(x), int(y)), logo_img)
        # done!
        return splash_img

    @classmethod
    def generate_end_splash(cls, context):
        # create canvas and draw
        img_size = (context.video_opt.width, context.video_opt.height)
        splash_img = Image.new('RGBA', img_size, cls.ES_BG_COLOR)
        drw = ImageDraw.Draw(splash_img)
        # draw logo
        logo_img = Image.open(cls.get_img_path(cls.ES_LOGO_FILE))
        new_size_x = cls.ES_LOGO_WIDTH_RATIO * splash_img.width
        new_size_y = logo_img.height * (new_size_x/logo_img.width)
        logo_img = logo_img.resize((int(new_size_x), int(new_size_y)), Image.ANTIALIAS)
        x = (splash_img.width - logo_img.width)/2
        y = (splash_img.height - logo_img.height)/2
        splash_img.paste(logo_img, (int(x), int(y)))
        # done!
        return splash_img
