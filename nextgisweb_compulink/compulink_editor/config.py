EDITABLE_LAYERS = {
    'actual_real_special_transition': {
        'style': {
            'strokeColor': '#FF00FF',
            'pointRadius': 8,
            'fillColor': '#FF00FF',
            'strokeWidth': 6,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.6,
            'graphicZIndex': 10
        }
    },
    'actual_real_special_transition_point': {
        'style': {
            'strokeColor': '#000000',
            'pointRadius': 8,
            'fillColor': '#FF00FF',
            'strokeWidth': 2,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.6,
            'graphicZIndex': 9999
        }
    },
    'actual_real_optical_cable': {
        'style': {
            'strokeColor': '#0066ff',
            'pointRadius': 6,
            'fillColor': '#0066ff',
            'strokeWidth': 3,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.6,
            'graphicZIndex': 10
        }
    },
    'actual_real_optical_cable_point': {
        'style': {
            'strokeColor': '#0066ff',
            'pointRadius': 6,
            'fillColor': '#0066ff',
            'strokeWidth': 1,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.6,
            'graphicZIndex': 9999
        }
    },
    'actual_real_fosc': {
        'style': {
            'strokeColor': '#000000',
            'pointRadius': 6,
            'fillColor': '#ffffff',
            'strokeWidth': 1.5,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.8,
            'graphicZIndex': 10
        }
    },
    'actual_real_optical_cross': {
        'style': {
            'strokeColor': '#000000',
            'pointRadius': 6,
            'fillColor': '#ffffff',
            'strokeWidth': 1.5,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.8,
            'graphicName': 'square',
            'graphicZIndex': 9999
        }
    },
    'actual_real_access_point': {
        'style': {
            'strokeColor': '#000000',
            'pointRadius': 10,
            'fillColor': '#000000',
            'strokeWidth': 1,
            'stroke': True,
            'fill': True,
            'fillOpacity': 0.7,
            'graphicZIndex': 9999
        }
    }
}


def GET_STYLES(request):
    return {
        'selected': {
            'externalGraphic': request.route_url('amd_package', subpath="") +
                               'ngw-compulink-editor/editor/templates/css/img/cross.png',
            'strokeColor': '#FF0000',
            'pointRadius': 10,
            'fillColor': '#FF0000',
            'strokeWidth': 4,
            'stroke': True,
            'fill': True,
            'fillOpacity': 1,
            'graphicZIndex': 999999
        }
    }
