define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers'
], function (declare, lang, on, topic, Evented, Deferred, openlayers) {
    return declare(null, {
        _map: null,
        _store: null,
        _layer: null,
        LAYER_NAME: null,
        DEFAULT_STYLE: null,
        WKT: new openlayers.Format.WKT(),

        constructor: function (map, store) {
            this._map = map;
            this._store = store;
            this._layer = new openlayers.Layer.Vector(this.LAYER_NAME, {
                // style: this.DEFAULT_STYLE,
                rendererOptions: {zIndexing: true}
            });
            this._bindEvents();
        },

        _bindEvents: function () {
            on(this._store, 'cleared', lang.hitch(this, function () {
                this._layer.removeAllFeatures();
            }));
        }
    });
});