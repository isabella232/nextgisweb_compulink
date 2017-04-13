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
            fillColor: '#70db70',
            strokeColor: '#70db70',
            graphicZIndex : 401,
            strokeWidth: 10,
            strokeOpacity: 1
        },

        HIGHLIGHT_STYLE: {
            fillColor: '#27a127',
            strokeColor: '#27a127',
            graphicZIndex : 410,
            strokeWidth: 15,
            strokeOpacity: 1
        },

        Z_INDEX: 401,
        _featuresById: null,

        _bindEvents: function () {
            this.inherited(arguments);

            topic.subscribe('compulink/accepted-parts/ui/layer/visibility/changed', lang.hitch(this, function (state) {
                if (state) {
                    this._map.olMap.addLayer(this._layer);
                } else {
                    if (this._layer.map) this._map.olMap.removeLayer(this._layer);
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

            topic.subscribe('compulink/accepted-parts/zoom', lang.hitch(this, this._highlightAndZoomFeature));
            topic.subscribe('compulink/accepted-parts/ui/table/selected', lang.hitch(this, this._highlightAndZoomFeature));
        },

        _highlightingFeature: null,
        _highlightAndZoomFeature: function (acceptedPart, zoomed) {
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

            if (zoomed) {
                this._map.olMap.zoomToExtent(feature.geometry.getBounds());
            }
        }
    });
});