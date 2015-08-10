from nextgisweb.registry import registry_maker


class AbstractReactor(object):
    registry = registry_maker()

    identity = 'Abstract'
    priority = 0

    @staticmethod
    def run(env):
        pass

