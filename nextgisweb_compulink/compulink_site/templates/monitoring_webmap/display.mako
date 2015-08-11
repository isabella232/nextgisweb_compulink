<%inherit file='nextgisweb_compulink:compulink_site/templates/base_site.mako' />


<%def name="title()">
    Карта контроля хода выполнения работ
</%def>

<%def name="head()">
    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/icons.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/layout.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/dgrid.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
          rel="stylesheet" type="text/css"/>
    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

    <script type="text/javascript">
            <% import json %>
        var focl_layers_type = [
            {
                "order": 12,
                "text": "Проектные данные",
                "icon": "sp_optical_cross",
                "id": "design_data_layers",
                "state": {
                    "opened": true
                },
                "children": ${json.dumps(focl_layers_type, indent=4).replace('\n', '\n' + (8 * ' ')) | n}
            },
            {
                "order": 12,
                "text": "Объекты размещения",
                "icon": "sp_optical_cross",
                "id": "objects_layers",
                "state": {
                    "opened": true
                },
                "children": ${json.dumps(objects_layers_type, indent=4).replace('\n', '\n' + (8 * ' ')) | n}
            },
            {
                "order": 12,
                "text": "Фактические данные",
                "icon": "sp_optical_cross",
                "id": "fact_data_layers",
                "state": {
                    "opened": true
                },
                "children": ${json.dumps(real_layers_type, indent=4).replace('\n', '\n' + (8 * ' ')) | n}
            }
        ];
        var sit_plan_layers_type = ${json.dumps(sit_plan_layers_type, indent=4).replace('\n', '\n' + (8 * ' ')) | n};

        var displayConfig = {
            "focl_layers_type": focl_layers_type,
            "sit_plan_layers_type": sit_plan_layers_type,
            "bookmarkLayerId": null,
            "rootItem": {
                "children": [],
                "expanded": null,
                "type": "root",
                "id": 1,
                "label": null
            },
            "extent": [
                20,
                20,
                180,
                80
            ],
            "mid": {
                "adapter": [],
                "basemap": [
                    "ngw/openlayers/layer/Layer",
                    "ngw/openlayers/layer/OSM",
                    "ngw/openlayers/layer/Google",
                    "ngw/openlayers/layer/Bing"
                ],
                "plugin": ["ngw-compulink-site/plugin/FeatureLayer"]
            }
        };

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-compulink-site/Display"
        ], function (parser, ready) {
            ready(function () {
                parser.parse();
            });
        });
    </script>

    <style type="text/css">
        body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
    </style>
</%def>

<div id="header" class="header">
            <div class="home-menu pure-menu pure-menu-open pure-menu-horizontal">

                <% settings = request.env.pyramid.settings %>
                %if 'logo' in settings and os.path.isfile(settings['logo']):
                    <img class="logo" src="${request.route_url('pyramid.logo')}"/>
                %endif

                <img class="logo" style="" src="${request.static_url('nextgisweb_compulink:compulink_site/static/img/cl_logo.png')}">

                <a class="pure-menu-heading" href="${request.application_url}">
                    ${request.env.core.settings['system.full_name']}
                </a>

                <ul>
                    %if request.user.is_administrator:
                        <li><a href="${request.route_url('resource.root')}">Панель управления</a></li>
                    %endif

                    %if request.user.keyname == 'guest':
                        <li><a href="${request.route_url('auth.login')}">Вход</a></li>
                    %else:
                        <li class="user">${request.user}</li>
                        <li><a href="${request.route_url('auth.logout')}">Выход</a></li>
                    %endif
                </ul>
            </div>

        </div>

<div data-dojo-id="display"
     data-dojo-type="ngw-compulink-site/Display"
     data-dojo-props="config: displayConfig"
     style="width: 100%; height: 100%">
</div>
