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
        LAYER_NAME: 'AcceptedParts.AcceptedParts',
        DEFAULT_STYLE: {
            fillColor: '#ff0000',
            strokeColor: '#ff0000',
            strokeWidth: 4,
            strokeOpacity: 1
        },

        HIGHLIGHT_STYLE: {
            fillColor: '#990000',
            strokeColor: '#990000',
            strokeWidth: 8,
            strokeOpacity: 1
        },

        Z_INDEX: 99999,
        _featuresById: null,

        _bindEvents: function () {
            this.inherited(arguments);

            topic.subscribe('compulink/accepted-parts/ui/layer/visibility/changed', lang.hitch(this, function (state) {
                if (state) {
                    this._map.olMap.addLayer(this._layer);
                } else {
                    this._map.olMap.removeLayer(this._layer);
                }
            }));

            this._store.on('fetched', lang.hitch(this, function (ngwFeatures) {
                var feature,
                    attributes;

                this._highlightingFeature = null;
                this._layer.destroyFeatures();

                this._featuresById = {};

                array.forEach(ngwFeatures, function (ngwFeature) {
                    feature = this.WKT.read(ngwFeature.geom);
                    attributes = ngwFeature.fields;
                    attributes.id = ngwFeature.id;
                    feature.attributes = attributes;
                    this._layer.addFeatures(feature);
                    this._featuresById[attributes.id] = feature;
                }, this);
            }));

            topic.subscribe('compulink/accepted-parts/ui/table/selected', lang.hitch(this, this._highlightAndZoomFeature));
        },

        _highlightingFeature: null,
        _highlightAndZoomFeature: function (acceptedPart) {
            var feature;

            if (!this._layer.map) return false;

            if (this._highlightingFeature) {
                this._highlightingFeature.style = this.DEFAULT_STYLE;
                this._layer.drawFeature(this._highlightingFeature);
            }

            feature = this._featuresById[acceptedPart.id];
            this._highlightingFeature = feature;
            feature.style = this.HIGHLIGHT_STYLE;
            this._layer.drawFeature(feature);

            this._map.olMap.zoomToExtent(feature.geometry.getBounds());
        }
    });
});