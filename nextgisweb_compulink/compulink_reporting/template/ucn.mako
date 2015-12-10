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

    <style>
        #dynamicsVols, #planVols, #dynamicsTd, #planTd {
            width: 100% !important;
            height: 100% !important;
            min-width: 600px;
            min-height: 300px;
        }
    </style>

    <script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

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
                var params, chartsManager;

                params = {
                    dynamicsVols: {
                        dataKeys: ['dynamics', 'Vols'],
                        chartSettings: {
                            title: 'Динамика строительства ВОЛС'
                        },
                        plotSettings: {
                            type: 'Default'
                        }
                    },
                    planVols: {
                        dataKeys: ['plan', 'Vols'],
                        chartSettings: {
                            title: 'Текущее исполнение плана строительства ВОЛС'
                        },
                        plotSettings: {
                            type: 'ClusteredColumns',
                            gap: 5,
                            maxBarSize: 20
                        }
                    },
                    dynamicsTd: {
                        dataKeys: ['dynamics', 'Td'],
                        chartSettings: {
                            title: 'Динамика строительства ТД'
                        },
                        plotSettings: {
                            type: 'Default'
                        }
                    },
                    planTd: {
                        dataKeys: ['plan', 'Td'],
                        chartSettings: {
                            title: 'Текущее исполнение плана строительства ТД'
                        },
                        plotSettings: {
                            type: 'ClusteredColumns',
                            gap: 5,
                            maxBarSize: 20
                        }
                    }
                };

                chartsManager = new ChartsManager(compulinkServiceFacade, params);
                chartsManager.init();
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

                <div id="selectDivision"
                     data-dojo-attach-point="divisionsSelect"
                     data-dojo-type="ngw-compulink-reporting/ucn/DivisionsSelect"
                     title="Подразделение Ростелекома"></div>

                <span>Период</span>

                <select id="selectYears"
                        data-dojo-type="ngw-compulink-reporting/ucn/YearsCheckedMultiSelect"
                        name="years">
                    %for year in years:
                        <option value="${year}">${year}</option>
                    %endfor
                </select>

                <button data-dojo-type="ngw-compulink-reporting/ucn/BuildChartsButton"
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
                                <div id="dynamicsVols" style="width: 100% !important; height: 100% !important;"></div>
                            </div>
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                                 style="width: 50%">
                                <div id="planVols" style="width: 100%; height: 100%;"></div>
                            </div>
                        </div>
                    </div>

                    <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                         style="width: 100%; height: 50%; border: none; margin:0; padding: 0;">
                        <div data-dojo-type="dijit/layout/BorderContainer" style="width: 100%; height: 100%;">
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'leading'"
                                 style="width: 50%">
                                <div id="dynamicsTd" style="width: 100%; height: 100%;"></div>
                            </div>
                            <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:'center'"
                                 style="width: 50%">
                                <div id="planTd" style="width: 100%; height: 100%;"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>

    </div>
</div>