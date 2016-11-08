define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers',
    './_BaseLayer'
], function (declare, lang, array, on, topic, Evented, Deferred, openlayers, _BaseLayer) {
    return declare([_BaseLayer], {
        LAYER_NAME: 'AcceptedParts.ActualRealOpticalCable',
        DEFAULT_STYLE: {
            fillColor: '#6666ff',
            strokeColor: '#6666ff'
        },

        _bindEvents: function () {
            this.inherited(arguments);

            this._store.on('fetched', lang.hitch(this, function (features) {
                var multilines = [],
                    multilineGeometry;
                array.forEach(features, function (ngwFeature) {
                    var feature = this.WKT.read(ngwFeature.geom);
                    multilines.push(feature);
                }, this);
                multilineGeometry = this.mergeMultilines(multilines);
                this._layer.addFeatures(new openlayers.Feature.Vector(multilineGeometry));
            }));

            topic.subscribe('compulink/accepted-parts/ui/layer/visibility/changed', lang.hitch(this, function (state) {
                if (state) {
                    this._map.olMap.addLayer(this._layer);
                    this._map.olMap.setLayerIndex(this._layer, 2000);
                    this._map.olMap.zoomToExtent(this._layer.getDataExtent());
                } else {
                    this._map.olMap.removeLayer(this._layer);
                }
            }));
        },

        mergeMultilines: function (multilinesFeatures) {
            var line,
                linestrings = [];

            array.forEach(multilinesFeatures, function (multiline) {
                line = multiline.geometry.components[0].clone();
                linestrings.push(line);
            });

            return new openlayers.Geometry.MultiLineString(linestrings);
        }
    });
});