from __future__ import print_function
from time import sleep
from datetime import datetime


UNITS = ('Minutes', 'Hours', 'Days', 'Months')
PHOTO = ('false', 'true')


class DefaultVideoPage:
    _base_url = '/compulink/player/recording_video?resource_id={res_id}&units={units}&count_units={count_units}&photo={photo}'
    _base_url_extra = '&zoom={zoom}&lat_center={lat_center}&lon_center={lon_center}&basemap={basemap}'
    _login_url = '/login?next=/resource/0'

    @property
    def login_url(self):
        return self._site_address + self._login_url

    @property
    def base_url(self):
        return self._site_address + self._base_url

    @property
    def base_url_extra(self):
        return self._base_url_extra


    def __init__(self, res_id, site_address, units=UNITS[0], count_units=1, photo=PHOTO[1], zoom=None, lat_center=None, lon_center=None, basemap=None):
        self._site_address = site_address
        self._res_id = res_id
        self._units = units
        self._count_units = count_units
        self._photo = photo
        self._zoom = zoom
        self._lat_center = lat_center
        self._lon_center = lon_center
        self._basemap = basemap

    def set_context(self, context):
        self.context = context

    def start_play(self):
        self.context.browser.driver.execute_script('window.startPlayer()')

    def login(self, user, passw):
        self.context.browser.visit(self.login_url)

        field = self.context.browser.find_by_name('login')
        field.first.fill(user)

        field = self.context.browser.find_by_name('password')
        field.first.fill(passw)

        self.context.browser.find_by_css(".auth-form__btn").first.click()
        sleep(3)
        while self.context.browser.driver.execute_script('return document.readyState') != 'complete':
            pass

        if self.login_url in self.context.browser.url:
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
        url = self.base_url.format(res_id=self._res_id, count_units=self._count_units, units=self._units, photo=self._photo)
        if self._zoom and self._lat_center and self._lon_center:
            url += self.base_url_extra.format(zoom=self._zoom, lat_center=self._lat_center, lon_center=self._lon_center, basemap=self._basemap)
        return url

    @property
    def res_id(self):
        return self._res_id
