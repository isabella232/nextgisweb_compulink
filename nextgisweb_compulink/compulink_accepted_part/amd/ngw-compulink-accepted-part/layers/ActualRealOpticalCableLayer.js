define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers',
    './_BaseLayer',
    './utils/OrderedMultilineMaker'
], function (declare, lang, array, on, topic, Evented, Deferred, openlayers, _BaseLayer, OrderedMultilineMaker) {
    return declare([_BaseLayer], {
        LAYER_NAME: 'AcceptedParts.ActualRealOpticalCable',
        DEFAULT_STYLE: {
            fillColor: '#6666ff',
            strokeColor: '#6666ff',
            width: 1,
            strokeOpacity: 0.5
        },
        Z_INDEX: 2000,

        _bindEvents: function () {
            this.inherited(arguments);

            this._store.on('fetched', lang.hitch(this, function (features) {
                var multilinesFetures = [],
                    orderedMultiLine;
                array.forEach(features, function (multilineNgwFeature) {
                    var feature = this.WKT.read(multilineNgwFeature.geom);
                    multilinesFetures.push(feature);
                }, this);
                orderedMultiLine = (new OrderedMultilineMaker()).makeOrderedMultiline(multilinesFetures);
                this._layer.addFeatures(new openlayers.Feature.Vector(orderedMultiLine));
            }));

            topic.subscribe('compulink/accepted-parts/ui/layer/visibility/changed', lang.hitch(this, function (state) {
                if (state) {
                    this._map.olMap.addLayer(this._layer);
                    this._map.olMap.zoomToExtent(this._layer.getDataExtent());
                } else {
                    this._map.olMap.removeLayer(this._layer);
                }
            }));
        }
    });
});