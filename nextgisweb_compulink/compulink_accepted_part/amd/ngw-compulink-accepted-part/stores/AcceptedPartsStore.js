define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'dojo/store/Memory',
    'dojox/dtl/_base',
    'dojo/request/xhr',
    './_BaseStore'
], function (declare, lang, on, topic, Evented, Deferred, Memory, dtlBase, xhr, _BaseStore) {
    return declare([_BaseStore], {
        LAYER_TYPE: 'accepted_part',

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
        },

        URL: new dtlBase.Template('/compulink/accepted-parts/{{constructObjectId}}/accepted-part', true),
        createAcceptedPart: function (acceptedPart) {
            var ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    constructObjectId: this._constructObjectId
                }),
                url = ngwApplicationUrl + this.URL.render(dtlContext);

            xhr(url, {
                handleAs: 'json',
                method: 'PUT',
                data: acceptedPart
            }).then(lang.hitch(this, function (result) {
                this.fetch(this._constructObjectId);
            }));
        }
    });
});