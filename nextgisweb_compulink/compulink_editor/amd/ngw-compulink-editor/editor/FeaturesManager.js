define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/promise/all',
    'dojo/topic',
    'ngw/openlayers'
], function (declare, lang, array, all, topic, openlayers) {

    return declare([], {
        constructor: function (map, ngwServiceFacade, editableLayersInfo, isCreateLayer, isFillObjects) {
            this._map = map;
            this._editableLayersInfo = editableLayersInfo;
            this._ngwServiceFacade = ngwServiceFacade;
            if (isCreateLayer) this.getLayer();
            if (isFillObjects) this.fillObjects();
        },

        _editableLayersInfo: null,
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
            this._bindAddLayerEvent(this._map.olMap);
            this._createModify();
            this._createSnapping();
            return this._layer;
        },

        _createModify: function () {
            this._modify = new openlayers.Control.ModifyFeature(this._layer);
            this._modify.mode = openlayers.Control.ModifyFeature.RESHAPE;
            this._modify.createVertices = false;
            this._map.olMap.addControl(this._modify);
            this._modify.activate();
        },

        _createSnapping: function () {
            this._snapping = new openlayers.Control.Snapping({
                layer: this._layer,
                targets: [this._layer],
                greedy: false
            });
            this._snapping.activate();
        },

        _bindAddLayerEvent: function (map) {
            map.events.register('addlayer', map, lang.hitch(this, function () {
                this._map.olMap.setLayerIndex(this._layer, 9999);
            }));
        },

        getLayer: function () {
            return this._getLayer();
        },

        fillObjects: function () {
            var getFeaturesPromises = [];

            array.forEach(this._editableLayersInfo, function (editableLayerInfo) {
                getFeaturesPromises.push(this._ngwServiceFacade.getAllFeatures(editableLayerInfo.id));
            }, this);

            all(getFeaturesPromises).then(lang.hitch(this, function (ngwFeatureItems) {
                this._createFeatures(ngwFeatureItems);
            }));
        },

        _createFeatures: function (ngwFeatureItems) {
            var feature,
                editableLayerInfo;

            array.forEach(ngwFeatureItems, function (ngwFeatures, getFeaturesPromiseIndex) {
                editableLayerInfo = this._editableLayersInfo[getFeaturesPromiseIndex];
                array.forEach(ngwFeatures, lang.hitch(this, function (ngwFeature) {
                    feature = this._wkt.read(ngwFeature.geom);
                    feature.style = editableLayerInfo.style;
                    feature.ngwLayerId = editableLayerInfo.id;
                    feature.ngwFeatureId = ngwFeature.id;
                    this.getLayer().addFeatures(feature);
                }))
            }, this);

            this.getLayer().events.register('beforefeaturemodified', this.getLayer(), function (event) {
                topic.publish('/editor/feature/select', event.feature);
            });
        }
    });
});