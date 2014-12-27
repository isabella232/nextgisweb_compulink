<%inherit file='nextgisweb:templates/base.mako' />


<%def name="title()">
    Карта контроля хода выполнения работ
</%def>

<%def name="head()">
    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/icons.css')}"
        rel="stylesheet" type="text/css" media="screen"/>

    <script type="text/javascript">
        var displayConfig = {
            "bookmarkLayerId": null, 
            "rootItem": {
                "children": [], 
                "expanded": null, 
                "type": "root", 
                "id": 1, 
                "label": null
            }, 
            "extent": [
                -180.0, 
                -90.0, 
                180.0, 
                90.0
            ], 
            "mid": {
                "adapter": [], 
                "basemap": [
                    "ngw/openlayers/layer/Layer",
                    "ngw/openlayers/layer/OSM",
                    "ngw/openlayers/layer/Google",
                    "ngw/openlayers/layer/Bing"
                ], 
                "plugin": []
            }
        };

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-compulink-site/Display"
        ], function (
            parser,
            ready
        ) {
            ready(function() {
                parser.parse();
            });
        });
    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>

</%def>

<div data-dojo-id="display"
    data-dojo-type="ngw-compulink-site/Display"
    data-dojo-props="config: displayConfig"
    style="width: 100%; height: 100%">
</div>
