define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojox/dtl/_base'
], function (declare, lang, xhr, dtlBase) {

    return declare([], {
        _ngwApplicationUrl: null,

        constructor: function (ngwApplicationUrl) {
            this._ngwApplicationUrl = ngwApplicationUrl || '';
        },

        GET_UCN_CHART_DATA: new dtlBase.Template('/compulink/reports/ucn/chart', true),

        get_ucn_chart_data: function (division, years) {
            var url = this._ngwApplicationUrl + this.GET_UCN_CHART_DATA.render();
            return xhr.post(url, {
                handleAs: 'json',
                data: {
                    division: division,
                    years: JSON.stringify(years)
                }
            });
        }
    });
});