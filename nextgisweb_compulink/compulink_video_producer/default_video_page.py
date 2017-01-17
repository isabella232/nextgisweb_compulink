from time import sleep

from datetime import datetime

from nextgisweb_compulink.compulink_video_producer.video_page import VideoPage


class DefaultVideoPage(VideoPage):
    _base_url = 'http://localhost:6543/compulink/player/recording_video?resource_id={res_id}'
    _login_url = 'http://localhost:6543/login?next=/resource/0'


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






