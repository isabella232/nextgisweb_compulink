<%inherit file='nextgisweb_compulink:compulink_site/templates/base_site.mako' />


<%def name="title()">
    Карта контроля хода выполнения работ
</%def>

<%def name="head()">
    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/icons.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/print.css')}"
          rel="stylesheet" type="text/css" media="print"/>

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
            },
            editorUrl: "${request.route_url('compulink.editor.map')}"
        };

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-compulink-admin/reference_books/RelationSelect",
            "ngw-compulink-admin/reference_books/RegionSelect",
            "ngw-compulink-admin/reference_books/BuildingObjectsRelationSelect",
            "dijit/form/DateTextBox",
            "ngw-compulink-site/Display",
            "ngw-compulink-site/DisplayHeader"
        ], function (parser, ready, RelationSelect, RegionSelect,
                     BuildingObjectsRelationSelect, DateTextBox) {
            ready(function () {
                construct_object_editor_settings = ${construct_objects_attr_settings | n};
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


<div class="main-wrapper">
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
    <div class="body-wrapper">
        <div data-dojo-id="display"
             data-dojo-type="ngw-compulink-site/Display"
             data-dojo-props="config: displayConfig"
             style="width: 100%; height: 100%">
        </div>
    </div>
</div>