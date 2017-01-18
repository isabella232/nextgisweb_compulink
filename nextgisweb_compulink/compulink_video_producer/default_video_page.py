from __future__ import print_function
from time import sleep
from datetime import datetime


UNITS = ('Minutes', 'Hours', 'Days', 'Months')
PHOTO = ('true', 'false')


class DefaultVideoPage:
    # TODO: move urls to ?
    _base_url = 'http://localhost:6543/compulink/player/recording_video?resource_id={res_id}&units={units}&count_units={count_units}&photo={photo}'
    _login_url = 'http://localhost:6543/login?next=/resource/0'

    def __init__(self, res_id, units=UNITS[0], count_units=1, photo=PHOTO[0]):
        self._res_id = res_id
        self._units = units
        self._count_units = count_units
        self._photo = photo

    def set_context(self, context):
        self.context = context

    def start_play(self):
        self.context.browser.driver.execute_script('window.startPlayer()')

    def login(self, user, passw):
        self.context.browser.visit(self._login_url)

        field = self.context.browser.find_by_name('login')
        field.first.fill(user)

        field = self.context.browser.find_by_name('password')
        field.first.fill(passw)

        self.context.browser.find_by_css(".auth-form__btn").first.click()
        sleep(3)
        while self.context.browser.driver.execute_script('return document.readyState') != 'complete':
            pass

        if self._login_url in self.context.browser.url:
            return False
        return True

    def sync_load(self):
        print(self.url)
        self.context.browser.visit(self.url)
        sleep(3)
        # white DOM
        max_timeout = 100
        timeout_start = datetime.now()
        while self.context.browser.driver.execute_script('return document.readyState') != 'complete':
            sleep(3)
            if (datetime.now() - timeout_start).seconds >max_timeout:
                break

        # white data loading
        timeout_start = datetime.now()
        while self.context.browser.driver.execute_script('return window.getPlayerState()') != 'ready':
            sleep(3)
            if (datetime.now() - timeout_start).seconds >max_timeout:
                break

        sleep(3)

    @property
    def is_finished(self):
        return self.context.browser.driver.execute_script('return window.getPlayerState()') == 'finished'

    @property
    def url(self):
        return self._base_url.format(res_id=self._res_id, count_units=self._count_units, units=self._units, photo=self._photo)

    @property
    def res_id(self):
        return self._res_id





