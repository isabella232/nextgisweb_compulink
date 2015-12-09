<%inherit file='nextgisweb_compulink:compulink_site/templates/base_site.mako' />

<%def name="title()">
    Отчёт УЦН
</%def>

<%def name="head()">

    <% import json %>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/icons.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/layout.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
          rel="stylesheet" type="text/css"/>

    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

    <script type="text/javascript">

        var divisions = ${divisions   | json.dumps, n},
                years = ${years | json.dumps, n};

        require([
            "dojo/parser",
            "dojo/ready"
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
        <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">

            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'top'" style="z-index: 999;">
                <span>Подразделение Ростелекома</span>

                <div data-dojo-attach-point="divisionsSelect"
                     data-dojo-type="ngw-compulink-reporting/ucn/DivisionsSelect"
                     title="Подразделение Ростелекома"></div>

                <span>Период</span>

                <select data-dojo-type="ngw-compulink-reporting/ucn/YearsCheckedMultiSelect"
                        name="years">
                    %for year in years:
                        <option value="${year}">${year}</option>
                    %endfor
                </select>

                <button data-dojo-type="dijit/form/Button"
                        data-dojo-props=""
                        type="button">Построить
                </button>
            </div>

            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'">

                <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">

                    <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'top'"
                         style="width: 100%; height: 50%; border: none; margin:0; padding: 0;">
                        <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'leading'"
                                 style="width: 50%">
                            </div>
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                                 style="width: 50%">
                            </div>
                        </div>
                    </div>

                    <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                         style="width: 100%; height: 50%; border: none; margin:0; padding: 0;">
                        <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'leading'"
                                 style="width: 50%">
                            </div>
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                                 style="width: 50%">
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>

    </div>
</div>