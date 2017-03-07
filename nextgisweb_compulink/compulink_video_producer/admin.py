# coding=utf-8
import json
from uuid import UUID

from nextgisweb_compulink.utils import success_response
from pyramid.response import Response
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

    vba = VideoBackgroundAudioFile()
    vba.file_name = params['name']
    vba.file_obj_uuid = UUID(params['id']).hex
    vba.file_mime_type = params['mime_type']
    vba.file_size = params['size']
    vba.persist()

    return {'value': vba.file_obj_uuid, 'label': vba.file_name}

