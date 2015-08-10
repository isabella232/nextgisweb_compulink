from .abstract_reactor import AbstractReactor

__author__ = 'yellow'

@AbstractReactor.registry.register
class Reactor2(AbstractReactor):
    identity = 'React2'
    priority = 2

    @staticmethod
    def run(env):
        print 'Reactor2 started!'