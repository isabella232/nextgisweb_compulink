def get_editable_layers_styles(request):
    amd_package_path = request.route_url('amd_package', subpath="")
    cross_icon_path = amd_package_path + 'ngw-compulink-editor/editor/templates/css/img/cross.png'

    return {
        'actual_real_special_transition': {
            'select': {
                'externalGraphic': cross_icon_path,
                'strokeColor': '#FF00FF',
                'pointRadius': 8,
                'fillColor': '#FF00FF',
                'strokeWidth': 6,
                'stroke': True,
                'fill': True,
                'fillOpacity': 1,
                'graphicZIndex': 10
            },
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
            'select': {
                'strokeColor': '#cc0000',
                'pointRadius': 8,
                'fillColor': '#FF0000',
                'strokeWidth': 2,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.9,
                'graphicZIndex': 9999
            },
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
            'select': {
                'externalGraphic': cross_icon_path,
                'strokeColor': '#FF0000',
                'pointRadius': 10,
                'fillColor': '#FF0000',
                'strokeWidth': 5,
                'stroke': True,
                'fill': True,
                'fillOpacity': 1,
                'strokeOpacity': 1,
                'graphicZIndex': 50
            },
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
            'select': {
                'strokeColor': '#cc0000',
                'pointRadius': 6,
                'fillColor': '#FF0000',
                'strokeWidth': 1,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.9,
                'graphicZIndex': 9999
            },
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
            'select': {
                'strokeColor': '#cc0000',
                'pointRadius': 6,
                'fillColor': '#FF0000',
                'strokeWidth': 1.5,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.8,
                'graphicZIndex': 9999
            },
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
            'select': {
                'strokeColor': '#cc0000',
                'pointRadius': 10,
                'fillColor': '#FF0000',
                'strokeWidth': 1,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.9,
                'graphicZIndex': 9999
            },
            'default': {
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
            'select': {
                'strokeColor': '#cc0000',
                'pointRadius': 10,
                'fillColor': '#FF0000',
                'strokeWidth': 1,
                'stroke': True,
                'fill': True,
                'fillOpacity': 0.9,
                'graphicZIndex': 9999
            },
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
