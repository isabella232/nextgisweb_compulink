define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojox/dtl/_base'
], function (declare, lang, xhr, dtlBase) {
    return declare(null, {
        GET_LAYER_INFO: new dtlBase.Template('/compulink/accepted-parts/layer-info/{{layerType}}/{{constructObjectId}}', true),

        getLayerInfo: function (layerType, constructObjectId) {
            var ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    layerType: layerType,
                    constructObjectId: constructObjectId
                }),
                url = ngwApplicationUrl + this.GET_LAYER_INFO.render(dtlContext);

            return xhr.get(url, {
                handleAs: 'json'
            });
        }
    });
});