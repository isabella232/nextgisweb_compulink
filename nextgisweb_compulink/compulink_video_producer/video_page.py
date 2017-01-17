
class VideoPage:
    _base_url = None
    _login_url = None

    def __init__(self, res_id):
        self._res_id = res_id

    def set_context(self, context):
        self.context = context

    def login(self, user, passw):
        pass


    def sync_load(self):
        pass

    def start_play(self):
        pass

    @property
    def is_finished(self):
        pass

    def tick(self):
        pass

    @property
    def url(self):
        return self._base_url.format(res_id=self._res_id)

    @property
    def res_id(self):
        return self._res_id
