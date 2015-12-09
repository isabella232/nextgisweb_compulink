define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojox/dtl/_base'
], function (declare, lang, xhr, dtlBase) {

    return declare([], {
        constructor: function (ngwApplicationUrl) {
            this.ngwApplicationUrl = ngwApplicationUrl || '';
        },

        GET_FEATURE: new dtlBase.Template('/api/resource/{{resourceId}}/feature/{{featureId}}', true),
        GET_ALL_FEATURES: new dtlBase.Template('/api/resource/{{resourceId}}/feature/', true),
        GET_RESOURCE: new dtlBase.Template('/api/resource/{{resourceId}}', true),

        ngwApplicationUrl: null,

        getAllFeatures: function (resourceId) {
            var dtlContext = new dtlBase.Context({resourceId: resourceId}),
                url = this.ngwApplicationUrl + this.GET_ALL_FEATURES.render(dtlContext);
            return xhr.get(url, {
                handleAs: 'json'
            });
        },

        getFeature: function (resourceId, featureId) {
            var dtlContext = new dtlBase.Context({resourceId: resourceId, featureId: featureId}),
                url = this.ngwApplicationUrl + this.GET_FEATURE.render(dtlContext);
            return xhr.get(url, {
                handleAs: 'json'
            });
        },

        getResourceInfo: function (resourceId) {
            var dtlContext = new dtlBase.Context({resourceId: resourceId}),
                url = this.ngwApplicationUrl + this.GET_RESOURCE.render(dtlContext);
            return xhr.get(url, {
                handleAs: 'json'
            });
        }
    });
});