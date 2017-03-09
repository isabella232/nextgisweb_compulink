# coding=utf-8
import json
from shutil import copyfileobj
from uuid import UUID

import transaction

from nextgisweb.file_storage import FileObj
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb_compulink.utils import success_response
from pyramid.response import Response, FileResponse
from pyramid.view import view_config

from nextgisweb_compulink.compulink_video_producer.model import VideoProduceTask, VideoBackgroundAudioFile

from nextgisweb import dynmenu as dm
from nextgisweb.env import env


def setup_pyramid(comp, config):
    # menu in admin
    config.add_route(
        'compulink_video_admin.settings',
        '/compulink_video_admin/settings') \
        .add_view(settings_page,  request_method='GET', renderer='nextgisweb_compulink.compulink_video_producer:/template/settings.mako') \

    config.add_route(
        'compulink_video_admin.settings_audio_list',
        '/compulink_video_admin/settings/audio/files', client=()) \
        .add_view(settings_audio_list,  request_method='GET')

    config.add_route(
        'compulink_video_admin.settings_audio_add',
        '/compulink_video_admin/settings/audio/add', client=()) \
        .add_view(settings_audio_add,  request_method='POST', renderer='json')

    config.add_route(
        'compulink_video_admin.settings_audio_active',
        '/compulink_video_admin/settings/audio/active', client=()) \
        .add_view(get_active,  request_method='GET', renderer='json') \
        .add_view(set_active,  request_method='POST', renderer='json')

    config.add_route(
        'compulink_video_admin.audio_file',
        '/compulink_video_admin/settings/active_audio') \
        .add_view(download_audio_file,  request_method='GET')

    # menu in admin
    class CompulinkVideoAdminMenu(dm.DynItem):
        def build(self, kwargs):
            yield dm.Link(
                self.sub('video_settings'), u'Настройки',
                lambda kwargs: kwargs.request.route_url('compulink_video_admin.settings')
            )

    CompulinkVideoAdminMenu.__dynmenu__ = comp.env.pyramid.control_panel

    comp.env.pyramid.control_panel.add(
        dm.Label('compulink_video_admin', u'Компьюлинк. Запись видео'),
        CompulinkVideoAdminMenu('compulink_video_admin'),
    )


def get_active(request):
    try:
        active_file = env.core.settings_get('compulink_video_producer', 'audio.active_file')
    except KeyError:
        active_file = None
    return {'active': active_file}


def set_active(request):
    body = request.json_body
    for k, v in body.iteritems():
        if k == 'active':
            env.core.settings_set('compulink_video_producer', 'audio.active_file', v)


def settings_page(request):
    return {'dynmenu': request.env.pyramid.control_panel}


@view_config(renderer='json')
def settings_audio_list(request):
    files = []
    file_recs = VideoBackgroundAudioFile.query().all()
    for f in file_recs:
        files.append(f.serialize())
    return Response(json.dumps({'audio_files': files}))


def settings_audio_add(request):
    params = request.json_body

    transaction.manager.begin()

    fileobj = env.file_storage.fileobj(component='compulink_video_producer')
    fileobj.persist()

    transaction.manager.commit()  # ugly hack

    transaction.manager.begin()
    fileobj.persist()

    srcfile, _ = env.file_upload.get_filename(params['id'])
    dstfile = env.file_storage.filename(fileobj, makedirs=True)

    with open(srcfile, 'r') as fs, open(dstfile, 'w') as fd:
        copyfileobj(fs, fd)

    vba = VideoBackgroundAudioFile()
    vba.file_name = params['name']
    vba.file_obj_id = fileobj.id
    vba.file_mime_type = params['mime_type']
    vba.file_size = params['size']
    vba.persist()

    transaction.manager.commit()
    vba.persist()

    return vba.serialize()


def download_audio_file(resource, request):
    try:
        active_file = env.core.settings_get('compulink_video_producer', 'audio.active_file')
    except KeyError:
        return HTTPNotFound('Set active audio file throw admin page!')

    vba = VideoBackgroundAudioFile.filter_by(id=active_file).one()
    file_obj = FileObj.filter(FileObj.id==vba.file_obj_id).one()
    fn = env.file_storage.filename(file_obj)

    return FileResponse(fn, content_type=bytes(vba.file_mime_type), request=request)

