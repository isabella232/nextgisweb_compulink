<%inherit file='nextgisweb_compulink:compulink_site/templates/base_site.mako' />

<%def name="title()">
    Отчёт о ходе строительства
</%def>

<%def name="head()">

    <% import json %>

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

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-compulink-deviation/DeviationGrid",
            "ngw-compulink-reporting/BuildingObjectsSelect"
        ], function (parser, ready) {
            ready(function () {
                parser.parse();
            });
        });
    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
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
             data-dojo-type="ngw-compulink-deviation/DeviationGrid"
             style="width: 100%; height: 100%;">
        </div>
    </div>
</div>