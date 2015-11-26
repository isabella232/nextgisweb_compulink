define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/promise/all',
    'ngw/openlayers',
    'ngw-compulink-editor/editor/openlayers/ModifyFeature',
    'ngw-compulink-editor/editor/openlayers/Snapping'
], function (declare, lang, array, all, openlayers, EditorModifyFeature, EditorSnapping) {

    return declare([], {
        constructor: function (map, ngwServiceFacade, editableLayersInfo, isCreateLayer, isFillObjects) {
            this._map = map;
            this._editableLayersInfo = editableLayersInfo;
            this._ngwServiceFacade = ngwServiceFacade;
            if (isCreateLayer) this.createLayer();
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
            return this._layer;
        },

        _createModify: function () {
            this._modify = new EditorModifyFeature(this._layer);
            this._modify.mode = EditorModifyFeature.RESHAPE;
            this._modify.createVertices = false;
            this._modify.bySegment = true;
            this._map.olMap.addControl(this._modify);
            this._modify.activate();
        },

        _createSnapping: function () {
            this._snapping = new EditorSnapping({
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

        createLayer: function () {
            this._getLayer();
            this._createModify();
            this._createSnapping();
            return this._getLayer();
        },

        getLayer: function () {
            return this.createLayer();
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
                    console.log(ngwFeature);
                    this.getLayer().addFeatures(feature);
                }))
            }, this);
        }
    });
});