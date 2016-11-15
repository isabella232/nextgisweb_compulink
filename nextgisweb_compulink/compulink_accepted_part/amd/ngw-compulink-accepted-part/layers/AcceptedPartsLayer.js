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
            width: 2,
            opacity: 0.8
        },
        Z_INDEX: 2001,
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
        }
    });
});