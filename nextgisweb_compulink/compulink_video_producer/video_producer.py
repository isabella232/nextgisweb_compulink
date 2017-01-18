# coding=utf-8
from __future__ import print_function

import shutil
import subprocess
import tempfile
import os
from datetime import datetime
from PIL import Image
from nextgisweb_compulink.compulink_admin.model import FoclStruct

from nextgisweb import DBSession
from splinter.browser import Browser

from nextgisweb_compulink.compulink_video_producer.splash_generator import SplashGenerator


class RecordingContext:

    def __init__(self):
        self.browser = None
        self.video_opt = None
        self.out_path = None
        self.temp_dir = None
        self.obj_name = None
        self.frame_counter = 0


class VideoProducer:
    FPS = 25
    FRAME_INC = 100

    TEMPORARY_OUT_V_FILE_NAME = 'out.avi'
    TEMPORARY_OUT_VA_FILE_NAME = 'out_audio.avi'

    def __init__(self):
        self.context = RecordingContext()

    # BROWSER STUFF
    def create_browser(self):
        params = {
        'driver_name': 'phantomjs',  # TODO: make OPT
        #'driver_name': 'firefox',
        'wait_time': 3
        }
        self.context.browser = Browser(**params)
        self.context.browser.driver.set_window_size(self.context.video_opt.width, self.context.video_opt.height)

    def kill_browser(self):
        self.context.browser.driver.quit()

    # SCREENSHOOT STUFF
    def _get_temp_frame_path(self, frame_num):
        return os.path.join(self.context.temp_dir, '{num:010d}.png'.format(num=frame_num))

    def shoot(self):
        screenshot_path = self._get_temp_frame_path(self.context.frame_counter)
        self.context.browser.driver.get_screenshot_as_file(screenshot_path)
        self.context.frame_counter += self.FRAME_INC
        print('Screen: %s' % self.context.frame_counter)

    def add_frame(self, image):
        screenshot_path = self._get_temp_frame_path(self.context.frame_counter)
        image.save(screenshot_path)
        self.context.frame_counter += self.FRAME_INC

    def copy_frame(self, frame_num, count):
        base_screenshot_path = self._get_temp_frame_path(frame_num)
        for i in range(1, count+1):
            new_path = self._get_temp_frame_path(frame_num + i)
            shutil.copy(base_screenshot_path, new_path)

    # START & END FRAMES, LABELS
    def make_start_frames(self, video_page):
        # get start frame
        scr = self.context.browser.screenshot()
        start_img = Image.open(scr)
        os.remove(scr)
        # create splash screen
        splash_img = SplashGenerator.generate_start_splash(self.context)
        # add frames
        frame_count_total = self.context.video_opt.start_delay * self.FPS
        frame_count_transition = self.context.video_opt.transition_time * self.FPS
        transp_delta = 1.0 / frame_count_transition
        # write only background
        for i in range(0, frame_count_total - frame_count_transition):
            self.add_frame(splash_img)
        # write transp
        for i in range(0, frame_count_transition):
            img = Image.blend(splash_img, start_img, i * transp_delta)
            self.add_frame(img)

    def make_end_frames(self, video_page):
        # get finish frame
        scr = self.context.browser.screenshot()
        end_im = Image.open(scr)
        os.remove(scr)
        # create splash screen
        splash_img = SplashGenerator.generate_end_splash(self.context)
        # add frames
        frame_count_total = self.context.video_opt.end_delay * self.FPS
        frame_count_transition = self.context.video_opt.transition_time * self.FPS
        transp_delta = 1.0 / frame_count_transition
        # write transp
        for i in range(0, frame_count_transition):
            img = Image.blend(end_im, splash_img, i * transp_delta)
            self.add_frame(img)
        # write only background
        for i in range(0, frame_count_total - frame_count_transition):
            self.add_frame(splash_img)

    def add_labels_for_frames(self):
        pass

    def make_video(self, video_page, video_opt, out_path):
        # TODO: Make common try-except and safety delete temp dir
        # prepare context
        self.context = RecordingContext()
        self.context.out_path = out_path
        self.context.video_opt = video_opt
        self.context.temp_dir = tempfile.mkdtemp()
        self.context.obj_name = self.get_resource_name(video_page.res_id)
        self.create_browser()
        # prepare video page
        video_page.set_context(self.context)
        # login to page
        video_page.login('administrator', 'admin1')  # TODO REPLACE TO SETTINGS

        # generate frames for start
        video_page.sync_load()
        self.make_start_frames(video_page)

        # generate main frames
        start_time = datetime.now()
        start_frame_num = self.context.frame_counter

        video_page.start_play()
        while not video_page.is_finished:
            self.shoot()
            #sleep(0.2)

        # add more frames
        total_time = (datetime.now() - start_time).seconds
        total_frames = self.context.frame_counter/self.FRAME_INC - start_frame_num/self.FRAME_INC
        avg_fps = float(total_frames)/total_time
        print('Avg fps: %s' % avg_fps)
        add_frames = int(round((self.FPS-avg_fps)/avg_fps))
        print('Add frames: %s' % add_frames)

        if add_frames >= 1:
            while start_frame_num < self.context.frame_counter:
                self.copy_frame(start_frame_num, add_frames)
                start_frame_num += self.FRAME_INC

        # generate frames for end
        self.make_end_frames(video_page)
        # add labels to frames
        self.add_labels_for_frames()

        # generate video file
        self.compile_video()
        # append video if needed
        if video_opt.sound_enabled:
            self.append_audio()
        # copy file to output path
        if video_opt.sound_enabled:
            src_path = os.path.join(self.context.temp_dir, self.TEMPORARY_OUT_VA_FILE_NAME)
        else:
            src_path = os.path.join(self.context.temp_dir, self.TEMPORARY_OUT_V_FILE_NAME)
        shutil.copy(src_path, self.context.out_path)

        # clean
        shutil.rmtree(self.context.temp_dir)
        self.kill_browser()

    # VIDEO & AUDIO FILE STUFF
    def compile_video(self):
        args = [
            'ffmpeg',
            '-pattern_type', 'glob',
            '-i', '*.png',
            '-c:v', 'mpeg4',
            '-r', '30',
            # TODO: find options for framerate
            self.TEMPORARY_OUT_V_FILE_NAME
        ]
        subprocess.Popen(args, cwd=self.context.temp_dir).wait()

    def append_audio(self):
        args = [
            'ffmpeg',
            '-i', self.TEMPORARY_OUT_V_FILE_NAME,
            '-i', '/home/yellow/Project/Compulink/test_env/nextgisweb_compulink/nextgisweb_compulink/compulink_site/static/sound/player-sound.mp3', # TODO: get OPTS
            '-shortest',
            self.TEMPORARY_OUT_VA_FILE_NAME
        ]
        subprocess.Popen(args, cwd=self.context.temp_dir).wait()

    # DB STUFF
    def get_resource_name(self, res_id):
        db_session = DBSession()
        fs_resource = db_session.query(FoclStruct).filter(FoclStruct.id == res_id).first()
        if fs_resource:
            return fs_resource.display_name
        else:
            return ''



