define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers',
    './_BaseLayer'
], function (declare, lang, on, topic, Evented, Deferred, openlayers, _BaseLayer) {
    return declare([_BaseLayer], {
        LAYER_NAME: 'AcceptedParts.AcceptedParts',
        DEFAULT_STYLE: {
            fillColor: '#ff0000',
            strokeColor: '#ff0000',
            width: 2
        },

        _bindEvents: function () {
            topic.subscribe('compulink/accepted-parts/ui/layer/visibility/changed', lang.hitch(this, function (state) {
                if (state) {
                    this._map.olMap.addLayer(this._layer);
                    this._map.olMap.setLayerIndex(this._layer, 2100);
                } else {
                    this._map.olMap.removeLayer(this._layer);
                }
            }));
        }
    });
});