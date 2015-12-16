<%inherit file='nextgisweb_compulink:compulink_site/templates/base_site.mako' />

<%def name="title()">
    Отчет по проекту УЦН
</%def>

<%def name="head()">

    <% import json %>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/icons.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/css/layout.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
          rel="stylesheet" type="text/css"/>

    <style type="text/css">
        body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }

        h1 {
            text-align: center;
        }

        #dynamicsVols, #planVols, #dynamicsTd, #planTd {
            width: 100% !important;
            height: 97% !important;
            text-align: center;
        }

        #dynamicsVolsLegend, #planVolsLegend, #dynamicsTdLegend, #planTdLegend {
            position: absolute;
            bottom: 3px;
            display: inline-table;
            left: 45%;
        }

        div.ucn-header-wrapper label {
            font-weight: bold;
        }
    </style>

    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

    <%include file="_ucn.chart.params.mako"/>

    <script type="text/javascript">

        var divisions = ${divisions   | json.dumps, n},
                years = ${years | json.dumps, n};

        require([
            'dojo/parser',
            'dojo/ready',
            'ngw-compulink-reporting/ucn/CompulinkServiceFacade',
            'ngw-compulink-reporting/ucn/ChartsManager'
        ], function (parser, ready, CompulinkServiceFacade, ChartsManager) {
            var compulinkServiceFacade = new CompulinkServiceFacade(ngwConfig.applicationUrl);
            parser.parse();
            ready(function () {
                var chartsManager;
                chartsManager = new ChartsManager(compulinkServiceFacade, params);
                chartsManager.init();
            });
        });
    </script>
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
            <div class="ucn-header-wrapper" data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'top'" style="z-index: 999;">
                <h1>Отчет о реализации проекта Устранение цифрового неравенства</h1>

                <div data-dojo-type="dojox/layout/TableContainer"
                     data-dojo-props="cols: 1, labelWidth: 150" style="width:50%; min-width: 600px">

                    <div id="selectDivision"
                         data-dojo-attach-point="divisionsSelect"
                         data-dojo-type="ngw-compulink-reporting/ucn/DivisionsSelect"
                         title="Подразделение Ростелекома"></div>
                    <select id="selectYears"
                            data-dojo-type="ngw-compulink-reporting/ucn/YearsCheckedMultiSelect"
                            name="years" title="Период">
                        %for year in years:
                            <option
                                % if year['selected'] == True:
                                    selected="selected"
                                % endif
                                    value="${year['year']}">${year['year']}</option>
                        %endfor
                    </select>
                </div>
                <button id="buildCharts"
                        data-dojo-type="ngw-compulink-reporting/ucn/BuildChartsButton"
                        data-dojo-props="yearsSelectorId: 'selectYears', divisionSelectorId: 'selectDivision'"
                        type="button">
                </button>

            </div>

            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'">

                <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">

                    <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'top'"
                         style="width: 100%; height: 50%; border: none; margin:0; padding: 0;">
                        <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'leading'"
                                 style="width: 50%">
                                <div id="dynamicsVols"
                                     style="width: 100% !important; height: 100% !important;"></div>
                                <div id="dynamicsVolsLegend"></div>
                            </div>
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                                 style="width: 50%">
                                <div id="planVols" style="width: 100%; height: 100%;"></div>
                                <div id="planVolsLegend"></div>
                            </div>
                        </div>
                    </div>

                    <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                         style="width: 100%; height: 50%; border: none; margin:0; padding: 0;">
                        <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'leading'"
                                 style="width: 50%">
                                <div id="dynamicsTd" style="width: 100%; height: 100%;"></div>
                                <div id="dynamicsTdLegend"></div>
                            </div>
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                                 style="width: 50%">
                                <div id="planTd" style="width: 100%; height: 100%;"></div>
                                <div id="planTdLegend"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>

    </div>
</div>