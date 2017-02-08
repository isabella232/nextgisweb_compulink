# -*- coding: utf-8 -*-
from __future__ import print_function, unicode_literals

import json
from datetime import date, datetime
from os import remove

import transaction
from babel.dates import format_date
from pyramid.httpexceptions import HTTPForbidden
from pyramid.response import Response, FileResponse
from pyramid.view import view_config

from nextgisweb.file_storage import FileObj
from nextgisweb.env import env
from nextgisweb import DBSession

from nextgisweb_compulink.compulink_admin.model import FoclStruct
from nextgisweb_compulink.utils import success_response

from .ident import COMP_ID
from .model import VideoProduceTask, TaskState
from .celery_tasks import task_make_video



def setup_pyramid(comp, config):
    config.add_route(
        'compulink.player.video.crud',
        '/compulink/player/video',
        client=()) \
        .add_view(get_video_list, request_method='GET') \
        .add_view(make_video, request_method='POST') \
        .add_view(remove_video, request_method='DELETE')

    config.add_route(
        'compulink.player.video.get_status',
        '/compulink/player/video/status/{id:\d+}', client=('id',)) \
        .add_view(get_video_status)

    config.add_route(
        'compulink.player.video.get_file',
        '/compulink/player/video/download/{id:\d+}', client=('id',)) \
        .add_view(get_video_file)


@view_config(renderer='json')
def get_video_list(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    video_list = []
    user_tasks = VideoProduceTask.filter(VideoProduceTask.user_id == request.user.id)
    for task in user_tasks:
        video_list.append({
            'id': task.id,
            'url': '/compulink/player/video/download/' + str(task.id),
            'name': get_task_full_name(task),
            'size': u'%.2f Мб' % (task.file_size/(1024*1024)) if task.file_size else '--',
            'created_date_time': (task.creation_dt - datetime(1970, 1, 1)).total_seconds(),
            'status': get_task_status(task)
        })
    return Response(json.dumps(video_list))


@view_config(renderer='json')
def make_video(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    params = request.json_body

    # create task in db
    transaction.manager.begin()

    task = VideoProduceTask()
    task.resource_id = params['resource_id']
    task.name = get_resource_name(params['resource_id'])
    task.units = params['units']
    task.units_count = params['count_units']
    task.lat_center = params['lat_center']
    task.lon_center = params['lon_center']
    task.photo_enabled = params['photo']
    task.sound_enabled = params['audio']
    task.zoom = params['zoom']
    task.user_id = request.user.id
    task.persist()
    transaction.manager.commit()

    task.persist()

    # send task to execution
    task_make_video.delay(task.id)

    # response
    return Response(json.dumps({
        'id': task.id,
        'name': get_task_full_name(task),
        'status': get_task_status(task)
    }))


@view_config(renderer='json')
def remove_video(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    video_id = request.json_body['id']

    db_session = DBSession()
    transaction.manager.begin()

    task = VideoProduceTask.filter(VideoProduceTask.user_id == request.user.id, VideoProduceTask.id == video_id)[0]
    fileobjs = FileObj.filter(FileObj.id == task.fileobj_id, FileObj.component == COMP_ID)
    for fileobj in fileobjs:
        fn = env.file_storage.filename(fileobj)
        db_session.delete(fileobj)
        try:
            remove(fn)
        except:
            pass

    db_session.delete(task)

    db_session.flush()
    transaction.manager.commit()



    return success_response()


@view_config(renderer='json')
def get_video_status(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    video_id = int(request.matchdict['id'])

    task = VideoProduceTask.filter(VideoProduceTask.user_id == request.user.id, VideoProduceTask.id == video_id)[0]

    return Response(json.dumps({
        'id': video_id,
        'name': get_task_full_name(task),
        'status': get_task_status(task)
    }))


@view_config(renderer='json')
def get_video_file(request):
    if request.user.keyname == 'guest':
        raise HTTPForbidden()

    video_id = int(request.matchdict['id'])

    task = VideoProduceTask.filter(VideoProduceTask.user_id == request.user.id, VideoProduceTask.id == video_id)[0]
    fileobj = FileObj.filter(FileObj.id == task.fileobj_id, FileObj.component == COMP_ID)[0]
    fn = env.file_storage.filename(fileobj)
    fr = FileResponse(fn, content_type=bytes(task.file_mime_type), request=request)
    fr.content_disposition = (u'attachment; filename="%s"' % task.file_name).encode('utf-8')  #quote_plus
    return fr


def get_task_full_name(task):
    return task.name + format_date(task.creation_dt, ' dd.MM.YYYY', locale='ru'),

def get_task_status(task):
    status = 'creating' * (task.state in [TaskState.CREATED, TaskState.STARTED]) + \
             'ready' * (task.state in [TaskState.SUCCESS_FINISHED]) + \
             'error' * (task.state in [TaskState.ERROR_FINISHED, TaskState.TIMEOUT_FINISHED])
    return status

def get_resource_name(res_id):
    db_session = DBSession()
    fs_resource = db_session.query(FoclStruct).filter(FoclStruct.id == res_id).first()
    if fs_resource:
        return fs_resource.display_name
    else:
        return ''
