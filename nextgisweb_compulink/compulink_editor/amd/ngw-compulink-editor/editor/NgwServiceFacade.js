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
        EDIT_FEATURE: new dtlBase.Template('/api/resource/{{resourceId}}/feature/{{featureId}}', true),
        GET_ALL_FEATURES: new dtlBase.Template('/api/resource/{{resourceId}}/feature/', true),
        GET_RESOURCE: new dtlBase.Template('/api/resource/{{resourceId}}', true),
        SAVE_EDITOR_FEATURES: '/editor/features/save',

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
        },

        /**
         * Represents a facade for saving modified features in editor.
         * @features {array of objects} Object should have following properties: wkt - wkt string, id - feature Id in NGW, layer - layer (or resource) Id in NGW
         */
        saveEditorFeatures: function (features) {
            var url = this.ngwApplicationUrl + this.SAVE_EDITOR_FEATURES;
            return xhr.post(url, {
                handleAs: 'json',
                data: JSON.stringify(features)
            });
        },

        changeFeature: function (layerId, featureId, geom, fields) {
            var dtlContext = new dtlBase.Context({resourceId: layerId, featureId: featureId}),
                url = this.ngwApplicationUrl + this.EDIT_FEATURE.render(dtlContext);
            return xhr.put(url, {
                handleAs: 'json',
                data: JSON.stringify(features)
            });
        }
    });
});