define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry',
    'ngw/openlayers'
], function (declare, lang, topic, Deferred, xhr, on, registry, openlayers) {
    return declare([], {
        settings: {},
        constructor: function (map) {
            this.map = map;
            this.federalLayer = new openlayers.Layer.Vector("Vectors", {
                        projection: new openlayers.Projection("EPSG:3857"),
                        strategies: [new openlayers.Strategy.Fixed()],
                        protocol: new openlayers.Protocol.HTTP({
                                url: 'http://127.0.0.1:6543/api/resource/496/geojson',
                                format: new openlayers.Format.GeoJSON({
                                    ignoreExtraDims: true
                                })
                        }),
                        eventListeners: {
                            "featuresadded": function() {
                                this.map.addLayer(this.federalLayer);
                                //this.map.zoomToExtent(this.getDataExtent());
                            }
                        }
                });
        }
    });
});