from __future__ import print_function

import os
import transaction
from babel.dates import format_date

from .ident import COMP_ID

from nextgisweb import DBSession

from nextgisweb.env import env

from nextgisweb.file_storage import FileObj

from nextgisweb_celery.app import celery_app as app
from celery.exceptions import SoftTimeLimitExceeded

from nextgisweb_compulink.compulink_video_producer.model import VideoProduceTask, TaskState
from .video_producer import VideoProducer
from .default_video_page import DefaultVideoPage, PHOTO
from .video_options import VideoOptions
from .video_format import VideoFormat


@app.task(reject_on_worker_lost=True, soft_time_limit=60*60)
def task_make_video(task_id):
    db_session = DBSession()
    try:
        transaction.manager.begin()
        # get task
        task = db_session.query(VideoProduceTask).get(task_id)
        task.state = TaskState.STARTED
        task.persist()
        # save to db and reattach orm objs to
        transaction.manager.commit()
        transaction.manager.begin()
        task.persist()

        #create fileobj
        fobj = FileObj(component=COMP_ID)
        fobj.persist()
        dst_file = env.file_storage.filename(fobj, makedirs=True)

        vo = VideoOptions()
        vo.photo_enabled = task.photo_enabled
        vo.sound_enabled = task.sound_enabled

        # create page and format
        site_address = env.compulink_video_producer.settings.get('site_address', None)
        if not site_address:
            AssertionError('Setup site address in config file')

        vp = DefaultVideoPage(
            res_id=task.resource_id,
            site_address=site_address,
            units=task.units,
            count_units=task.units_count,
            photo=PHOTO[1 if task.photo_enabled else 0],
            zoom=task.zoom,
            lat_center=task.lat_center,
            lon_center=task.lon_center,
            basemap=task.basemap
        )

        vf_name = env.compulink_video_producer.settings.get('video_format', None)
        if not vf_name:
            AssertionError('Setup video format in config file')
        vf = VideoFormat.registry.get(vf_name)

        # create video
        with VideoProducer() as video_producer:
            video_producer.make_video(vp, vo, vf, dst_file)

        # update task
        task.state = TaskState.SUCCESS_FINISHED
        task.file_name = u'%s [%s].%s' % (task.name, format_date(task.creation_dt, 'dd.MM.YYYY', locale='ru'), vf.file_ext)
        task.file_mime_type = vf.mime_type
        task.file_size = os.path.getsize(dst_file)
        task.fileobj_id = fobj.id

        transaction.manager.commit()

    except SoftTimeLimitExceeded:
        try:
            task.state = TaskState.TIMEOUT_FINISHED
            task.persist()
            transaction.manager.commit()
        except:
            pass
    except Exception as ex:
        try:
            print(ex.message)
            task.state = TaskState.ERROR_FINISHED
            task.persist()
            transaction.manager.commit()
        except:
            pass
        raise
