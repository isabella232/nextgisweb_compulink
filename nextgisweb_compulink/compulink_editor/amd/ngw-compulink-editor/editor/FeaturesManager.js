define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/promise/all',
    'ngw/openlayers'
], function (declare, lang, array, all, openlayers) {

    return declare([], {
        constructor: function (map, ngwServiceFacade, editableLayersId, isCreateLayer, isFillObjects) {
            this._map = map;
            this._editableLayersId = editableLayersId;
            this._ngwServiceFacade = ngwServiceFacade;
            if (isCreateLayer) this.createLayer();
            if (isFillObjects) this.fillObjects();
        },

        _editableLayersId: null,
        _map: null,
        _ngwServiceFacade: null,
        _layer: null,
        _wkt: new openlayers.Format.WKT(),
        _modify: null,

        _getLayer: function () {
            if (this._layer) return this._layer;

            this._layer = new openlayers.Layer.Vector('FeaturesManager.Layer');
            this._map.olMap.addLayer(this._layer);
            this._map.olMap.setLayerIndex(this._layer, 9999);
            return this._layer;
        },

        _createModify: function () {
            this._modify = new openlayers.Control.ModifyFeature(this._layer);
            this._modify.mode = openlayers.Control.ModifyFeature.DRAG;
            // todo: fix TypeError: Cannot read property 'Z_INDEX_BASE' of null
            //this._modify.activate();
        },

        createLayer: function () {
            this._getLayer();
            this._createModify();
            return this._getLayer();
        },

        getLayer: function () {
            return this.createLayer();
        },

        fillObjects: function () {
            var getFeaturesPromises = [];

            array.forEach(this._editableLayersId, function (editableLayerId) {
                getFeaturesPromises.push(this._ngwServiceFacade.getAllFeatures(editableLayerId));
            }, this);

            all(getFeaturesPromises).then(lang.hitch(this, function (ngwFeatureItems) {
                this._createFeatures(ngwFeatureItems);
            }));
        },

        _createFeatures: function (ngwFeatureItems) {
            var features;

            array.forEach(ngwFeatureItems, function (ngwFeatures) {
                array.forEach(ngwFeatures, lang.hitch(this, function (ngwFeature) {
                    features = this._wkt.read(ngwFeature.geom);
                    this.getLayer().addFeatures(features);
                }))
            }, this);
        }
    });
});