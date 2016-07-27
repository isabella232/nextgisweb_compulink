<%inherit file='nextgisweb_compulink:compulink_statistic_map/templates/base_site.mako' />


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

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/qtip/jquery.qtip.min.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
          rel="stylesheet" type="text/css"/>

    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>
    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery-ui.js')}"></script>

    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/qtip/jquery.qtip.js')}"></script>


    <script type="text/javascript">
            <% import json %>

        var displayConfig = {
            "bookmarkLayerId": null,
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
                "plugin": ["ngw-compulink-statistic-map/plugin/FeatureLayer"]
            }
        };

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-compulink-admin/reference_books/RelationSelect",
            "ngw-compulink-admin/reference_books/RegionSelect",
            "ngw-compulink-admin/reference_books/BuildingObjectsRelationSelect",
            "dijit/form/DateTextBox",
            "ngw-compulink-statistic-map/Display",
            "ngw-compulink-site/DisplayHeader"
        ], function (parser, ready, RelationSelect, RegionSelect,
                     BuildingObjectsRelationSelect, DateTextBox) {
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
             data-dojo-type="ngw-compulink-statistic-map/Display"
             data-dojo-props="config: displayConfig"
             style="width: 100%; height: 100%">
        </div>
    </div>
</div>