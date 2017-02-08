# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from nextgisweb.component import Component, require
from .model import Base
from .ident import COMP_ID
from .command import Command
from .celery_tasks import task_make_video

class CompulinkVideoProducerComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    @require('auth')
    def initialize(self):
        super(CompulinkVideoProducerComponent, self).initialize()

    def setup_pyramid(self, config):
        super(CompulinkVideoProducerComponent, self).setup_pyramid(config)

        from . import view
        view.setup_pyramid(self, config)

    settings_info = (
        dict(key='browser_driver', desc=u"Драйвер браузера. Может быть 'phantomjs' или 'firefox'. Второй только для тестов!"),
        dict(key='video_rec_user', desc=u"Пользователь, из под которого происходит запись"),
        dict(key='video_rec_pass', desc=u"Пароль пользователя"),
        dict(key='video_format', desc=u"Формат записи видео ('Mpeg4' или 'X264')"),
        dict(key='site_address', desc=u"Адрес сайта развертывания системы(например http://localhost:6543)"),
    )
