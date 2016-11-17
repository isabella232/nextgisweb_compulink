define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'dojo/store/Memory',
    'dojox/dtl/_base',
    'ngw-compulink-editor/editor/NgwServiceFacade',
    './_ServiceFacadeMixin'
], function (declare, lang, on, topic, Evented, Deferred, Memory, dtlBase, NgwServiceFacade, _ServiceFacadeMixin) {
    return declare([Memory, _ServiceFacadeMixin, Evented], {
        LAYER_TYPE: null,

        _ngwServiceFacade: null,
        _constructObjectId: null,
        _layerId: null,

        constructor: function () {
            this.data = [];
            this._ngwServiceFacade = new NgwServiceFacade();
        },

        fetch: function (constructObjectId) {
            var getLayerInfo = this.getLayerInfo(this.LAYER_TYPE, constructObjectId);
            this._constructObjectId = constructObjectId;
            getLayerInfo.then(lang.hitch(this, function (layerInfo) {
                this._layerId = layerInfo.resource.id;
                var getAllFeatures = this._ngwServiceFacade.getAllFeatures(this._layerId);
                getAllFeatures.then(lang.hitch(this, function (features) {
                    this.data = features;
                    this.emit('fetched', features);
                }));
            }));
        },

        clear: function () {
            this.data = [];
            this.emit('cleared');
        }
    });
});