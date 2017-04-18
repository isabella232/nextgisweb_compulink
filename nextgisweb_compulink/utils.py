import json
from pyramid.response import Response


def error_response(mes):
    resp = {'status': 'error', 'message': mes}
    return Response(json.dumps(resp), status=400)


def success_response():
    resp = {'status': 'ok'}
    return Response(json.dumps(resp))
