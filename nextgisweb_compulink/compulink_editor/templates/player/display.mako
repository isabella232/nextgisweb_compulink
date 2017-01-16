<%inherit file='nextgisweb_compulink:compulink_editor/templates/base_site.mako' />

<%def name="title()">
    Карта контроля хода выполнения работ
</%def>

<%def name="head()">
    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/icons.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/print.css')}"
          rel="stylesheet" type="text/css" media="print"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/layout_ngw.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/dgrid.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
          rel="stylesheet" type="text/css"/>

    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

    %if is_recording:
        <%include file="_video_recording_js_params.mako"></%include>
    %endif

    <script type="text/javascript">
            <% import json %>
        var focl_layers_type = [
            {
                "order": 12,
                "text": "Проектные данные",
                "icon": "sp_optical_cross",
                "id": "design_data_layers",
                "state": {
                    "opened": false
                },
                "children": ${json.dumps(focl_layers_type, indent=4).replace('\n', '\n' + (8 * ' ')) | n}
            },
            {
                "order": 12,
                "text": "Объекты размещения",
                "icon": "sp_optical_cross",
                "id": "objects_layers",
                "state": {
                    "opened": false
                },
                "children": ${json.dumps(objects_layers_type, indent=4).replace('\n', '\n' + (8 * ' ')) | n}
            },
            {
                "order": 12,
                "text": "Исходные фактические данные",
                "icon": "sp_optical_cross",
                "id": "fact_data_layers",
                "state": {
                    "opened": false
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
            "extent": ${json.dumps(extent)},
            "mid": {
                "adapter": [],
                "basemap": [
                    "ngw/openlayers/layer/Layer",
                    "ngw/openlayers/layer/OSM",
                    "ngw/openlayers/layer/Google",
                    "ngw/openlayers/layer/Bing"
                ],
                "plugin": ["ngw-compulink-site/plugin/FeatureLayer"]
            },
            "playerSoundFile": "${request.static_url(player_sound_file)}"
        };
    </script>

    %if is_recording:
        <%include file="display_dojo_parser/player_for_recording_video.mako"></%include>
    %else:
        <%include file="display_dojo_parser/player.mako"></%include>
    %endif

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


<div class="main-wrapper">

    %if not is_recording:
        <div class="header-wrapper">
            <div id="headerContainer"
                 data-dojo-type="dijit/layout/ContentPane"
                 data-dojo-props="region: 'top'"
                 style="width: 100%; overflow:visible;">
                <div data-dojo-id="displayHeader"
                     data-dojo-type="ngw-compulink-site/DisplayHeader"
                     data-dojo-props="">
                </div>
            </div>
        </div>
    %endif

    <div class="body-wrapper">
        %if is_recording:
            <%include file="display_widget/player_for_recording_video.mako"></%include>
        %else:
            <%include file="display_widget/player.mako"></%include>
        %endif
    </div>
</div>