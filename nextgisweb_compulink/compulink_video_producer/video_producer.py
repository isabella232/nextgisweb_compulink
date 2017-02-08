# coding=utf-8
from __future__ import print_function

import shutil
import subprocess
import tempfile
import os
from datetime import datetime
from PIL import Image

from nextgisweb_compulink.compulink_admin.model import FoclStruct, ConstructObject
from nextgisweb.env import env

from nextgisweb import DBSession
from splinter.browser import Browser

from nextgisweb_compulink.compulink_video_producer.splash_generator import SplashGenerator


class RecordingContext:

    def __init__(self):
        self.browser = None
        self.video_opt = None
        self.video_format = None
        self.out_path = None
        self.temp_dir = None
        self.obj_name = None
        self.build_dates = None
        self.frame_counter = 0


class VideoProducer(object):
    FPS = 25
    FRAME_INC = 100

    # INIT && FINALIZE
    def __init__(self):
        self.context = RecordingContext()

    def __enter__(self):
        self.context = RecordingContext()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            self.kill_browser()
        except:
            pass
        try:
            shutil.rmtree(self.context.temp_dir)
        except:
            pass

    @property
    def temporary_out_v_file_name(self):
        vf = self.context.video_format
        return 'out.%s' % vf.file_ext

    @property
    def temporary_out_va_file_name(self):
        vf = self.context.video_format
        return 'out_audio.%s' % vf.file_ext


    # BROWSER STUFF
    def create_browser(self):
        browser_driver = env.compulink_video_producer.settings.get('browser_driver', 'phantomjs')
        browser_params = {
            'driver_name': browser_driver,
            'wait_time': 3
        }
        self.context.browser = Browser(**browser_params)
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

    def make_video(self, video_page, video_opt, video_format, out_path):
        # prepare context
        self.context = RecordingContext()
        self.context.out_path = out_path
        self.context.video_opt = video_opt
        self.context.video_format = video_format
        self.context.temp_dir = tempfile.mkdtemp()
        self.context.obj_name = self.get_resource_name(video_page.res_id)
        self.context.build_dates = self.get_buildings_dates(video_page.res_id)
        self.create_browser()
        # prepare video page
        video_page.set_context(self.context)
        # login to page
        user = env.compulink_video_producer.settings.get('video_rec_user')
        passw = env.compulink_video_producer.settings.get('video_rec_pass')
        if not user or not passw:
            AssertionError('Setup user and pass for video recording in config file')
        video_page.login(user, passw)

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
        # append audio if needed
        if video_opt.sound_enabled:
            self.append_audio()
        # copy file to output path
        if video_opt.sound_enabled:
            src_path = os.path.join(self.context.temp_dir, self.temporary_out_va_file_name)
        else:
            src_path = os.path.join(self.context.temp_dir, self.temporary_out_v_file_name)
        shutil.copy(src_path, self.context.out_path)

        # clean
        self.kill_browser()
        shutil.rmtree(self.context.temp_dir)

    # VIDEO & AUDIO FILE STUFF
    def compile_video(self):
        vf = self.context.video_format
        args = [
            'ffmpeg',
            '-v', 'error',
            '-pattern_type', 'glob',
            '-i', '*.png',
            '-c:v', vf.ffmpeg_video_codec,
            '-r', '30',
        ]
        args.extend(vf.ffmpeg_extra_args)
        args.append(self.temporary_out_v_file_name)
        subprocess.Popen(args, cwd=self.context.temp_dir).wait()

    def append_audio(self):
        sound_file_sett = env.pyramid.settings.get('player_sound_file', None)
        if not sound_file_sett:
            AssertionError('Setup sound_file_sett in config file')

        from nextgisweb.pyramidcomp import resource_filename
        sound_file_path = resource_filename(sound_file_sett.split(':')[0], sound_file_sett.split(':')[1])

        vf = self.context.video_format
        args = [
            'ffmpeg',
            '-v', 'error',
            '-i', self.temporary_out_v_file_name,
            '-i', sound_file_path,
            '-c:v', 'copy',
            '-shortest',
            self.temporary_out_va_file_name
        ]
        args.extend(vf.ffmpeg_audio_args)
        subprocess.Popen(args, cwd=self.context.temp_dir).wait()

    # DB STUFF
    def get_resource_name(self, res_id):
        db_session = DBSession()
        fs_resource = db_session.query(FoclStruct).filter(FoclStruct.id == res_id).first()
        if fs_resource:
            return fs_resource.display_name
        else:
            return ''

    def get_buildings_dates(self, res_id):
        db_session = DBSession()
        co = db_session.query(ConstructObject).filter(ConstructObject.resource_id == res_id).first()
        if co:
            return (co.start_build_date, co.end_build_date)
        else:
            return (None, None)




