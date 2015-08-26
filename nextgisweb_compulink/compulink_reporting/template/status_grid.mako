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

    <script type="text/javascript">

        require([
            "dojo/parser",
            "dojo/ready",
            "ngw-compulink-reporting/ReportGrid"
        ], function (parser, ready) {
            ready(function () {
                parser.parse();
            });
        });

        var rlist = ${regions   | json.dumps, n},
            dlist = ${districts | json.dumps, n};

    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
    </style>
</%def>


<div data-dojo-id="display"
     data-dojo-type="ngw-compulink-reporting/ReportGrid"
     style="width: 100%; height: 100%">
</div>
