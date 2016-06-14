def get_playable_layers_styles(request):
    amd_package_path = request.route_url('amd_package', subpath="")
    cross_icon_path = amd_package_path + 'ngw-compulink-editor/editor/templates/css/img/cross.png'

    return {
        'actual_real_special_transition': {
            'default': {
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
            'default': {
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
            'default': {
                'strokeColor': '#0066ff',
                'pointRadius': 6,
                'fillColor': '#0066ff',
                'strokeWidth': 3,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.6,
                'strokeOpacity': 0.6,
                'graphicZIndex': 10
            }
        },
        'actual_real_optical_cable_point': {
            'default': {
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
            'default': {
                'strokeColor': '#000000',
                'pointRadius': 6,
                'fillColor': '#ffffff',
                'strokeWidth': 1.5,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.8,
                'graphicZIndex': 9999
            }
        },
        'actual_real_optical_cross': {
            'default': {
                'strokeColor': '#000000',
                'pointRadius': 6,
                'fillColor': '#ffffff',
                'strokeWidth': 2,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.8,
                'graphicName': 'square',
                'graphicZIndex': 9999
            }
        },
        'actual_real_access_point': {
            'default': {
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
