from nextgisweb.registry import registry_maker


class VideoFormat:
    registry = registry_maker()

    file_ext = None
    mime_type = None
    ffmpeg_video_codec = None
    ffmpeg_extra_args = []
    ffmpeg_audio_args = []


@VideoFormat.registry.register
class Mpeg4(VideoFormat):
    identity = 'Mpeg4'
    file_ext = 'mp4'
    mime_type = 'video/mp4'
    ffmpeg_video_codec = 'mpeg4'
    ffmpeg_extra_args = ['-b:v', '16000k', ]
    ffmpeg_audio_args = ['-c:a', 'libmp3lame', ]


@VideoFormat.registry.register
class X264(VideoFormat):
    identity = 'X264'
    file_ext = 'mkv'
    mime_type = 'video/x-matroska'
    ffmpeg_video_codec = 'libx264'
