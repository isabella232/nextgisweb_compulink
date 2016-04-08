/**
 * Created by yellow on 7/25/15.
 */

/*global define*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom"
], function ( declare) {
        return declare([], {
            constructor: function (map) {
                this.map = map;
                var baselayers = map.olMap.getLayersBy('isBaseLayer', true);
                this.zIndex = baselayers[baselayers.length-1].getZIndex() + 100;

                this.cadastreLayer = new OpenLayers.Layer.WMS("Ru Cadastre",
                                   "http://maps.rosreestr.ru/arcgis/services/Cadastre/CadastreWMS/MapServer/WMSServer",
                                   {
                                       layers: "1,2,3,5,6,7,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24",
                                       transparent: true
                                   },
                                   {
                                       tileSize: new OpenLayers.Size(512, 512),
                                       singleTile: false
                                   });

                this.cadastreLayer.setVisibility(false);
                this.cadastreLayer.setZIndex(this.zIndex);
                this.map.olMap.addLayer(this.cadastreLayer);

                //
                OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
                OpenLayers.Util.onImageLoadErrorColor = "transparent";
            },

            switchLayer: function(enabled) {
                this.cadastreLayer.setVisibility(enabled);
            }

        });
});