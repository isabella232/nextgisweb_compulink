define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-geometry',
    'dojo/topic',
    'dojo/on',
    'dojox/lang/functional',
    'dojox/charting/Chart',
    'dojox/charting/action2d/Tooltip',
    'dojox/charting/widget/Legend',
    'dojox/charting/themes/Minty',
    'dojox/charting/axis2d/Default',
    'dojox/charting/plot2d/Default',
    'dojox/charting/plot2d/Markers',
    'dojox/charting/plot2d/ClusteredColumns'
], function (declare, lang, array, domGeometry, topic, on, df, Chart, Tooltip, Legend, theme) {

    return declare([], {
        _compulinkServiceFacade: null,
        _params: null,
        _charts: null,

        constructor: function (compulinkServiceFacade, params) {
            this._compulinkServiceFacade = compulinkServiceFacade;
            this._params = params;
            this._bindEvents();
        },

        _bindEvents: function () {
            topic.subscribe('/reports/ucn/charts/render', lang.hitch(this, function (params) {
                this.updateCharts(params.division, params.years);
            }));

            on(window, 'resize', lang.hitch(this, function () {
                if (this._charts) {
                    this._reRenderAllCharts();
                } else {
                    return false;
                }
            }));
        },

        _reRenderAllCharts: function () {
            var idChart, chart, chartDivSize;

            for (idChart in this._charts) {
                if (this._charts.hasOwnProperty(idChart)) {
                    chart = this._charts[idChart].chart;
                    chartDivSize = domGeometry.position(chart.node, false);
                    chart.resize(chartDivSize.w, chartDivSize.h);
                    chart.setTheme(theme).fullRender();
                }
            }
        },

        updateCharts: function (division, years) {
            this._compulinkServiceFacade.get_ucn_chart_data(division, years)
                .then(lang.hitch(this, function (chartsData) {
                    this._updateCharts(chartsData);
                }));
        },

        init: function () {
            if (!this._params || this._charts) return false;

            var params = this._params,
                chartParams,
                id, chart;

            this._charts = {};

            for (id in params) {
                if (params.hasOwnProperty(id)) {
                    chartParams = params[id];
                    chart = new Chart(id, chartParams.chartSettings).
                    addAxis('x', chartParams.axisSettings.x).
                    addAxis('y', chartParams.axisSettings.y).
                    addPlot('default', chartParams.plotSettings);
                    this._charts[id] = {chart: null, legend: null};
                    this._charts[id].chart = chart;
                }
            }

            topic.publish('/reports/ucn/charts/init');
        },

        _updateCharts: function (chartsData) {
            var idChart, chartItem, chart, dataKeys, chartDivSize, xSettings;

            for (idChart in this._charts) {
                if (this._charts.hasOwnProperty(idChart)) {
                    chartItem = this._charts[idChart];
                    chart = chartItem.chart;
                    dataKeys = this._params[idChart].dataKeys;
                    chart.removeAxis('x');
                    xSettings = this._params[idChart].axisSettings.x;
                    xSettings.labels = chartsData[dataKeys[0]].labels;
                    chart.addAxis('x', xSettings);
                    this._clearSeries(chart);
                    this._addSeries(chart, chartsData[dataKeys[0]][dataKeys[1]],
                        this._params[idChart].seriesSettings);
                    if (!chartItem.tooltip) {
                        chartItem.tooltip = new Tooltip(chart, 'default');
                    }
                    chartDivSize = domGeometry.position(chart.node, false);
                    chart.resize(chartDivSize.w, chartDivSize.h);
                    chart.setTheme(theme).fullRender();

                    if (!chartItem.legend) {
                        chartItem.legend = new Legend({chart: chart}, idChart + 'Legend');
                    }
                }
            }
        },

        _clearSeries: function (chart) {
            while (chart.series.length > 0)
                chart.removeSeries(chart.series[0].name);
        },

        _addSeries: function (chart, seriesData, seriesParams) {
            df.forIn(seriesData, function (series, seriesName) {
                chart.addSeries(seriesParams[seriesName].name, series, seriesParams[seriesName]);
            }, this);
        }
    });
});
