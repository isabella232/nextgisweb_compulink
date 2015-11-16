define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojox/dtl/_base',
    'dojox/dtl/Context'
], function (declare, lang, xhr, dtlBase, dtlContext) {

    return declare([], {
        constructor: function (ngwApplicationUrl) {
            this.ngwApplicationUrl = ngwApplicationUrl || '';
        },

        GET_FEATURE: new dtlBase.Template('/api/resource/{{resourceId}}/feature/{{featureId}}', true),
        GET_ALL_FEATURES: new dtlBase.Template('/api/resource/{{resourceId}}/feature/', true),

        ngwApplicationUrl: null,

        getAllFeatures: function (resourceId) {
            var dtlContext = new dtlBase.Context({resourceId: resourceId}),
                url = this.ngwApplicationUrl + this.GET_ALL_FEATURES.render(dtlContext);
            return xhr.get(url, {
                handleAs: 'json'
            });
        }
    });
});