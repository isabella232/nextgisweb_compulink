define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'ngw/openlayers'
], function (declare, lang, openlayers) {
    var identifyLayerName = 'vectorIdentify',
        identifyIconLoading = new openlayers.Icon(
            ngwConfig.compulinkAssetUrl + 'img/identify-loading.svg',
            new openlayers.Size(40, 40)),
        identifyLayer = new openlayers.Layer.Markers(identifyLayerName);
    return {
        showIdentify: function (map, latlon) {
            if (map.getLayersByName(identifyLayerName).length === 0) {
                map.addLayer(identifyLayer);
            }
            map.setLayerIndex(identifyLayer, 99999999);
            var identifyLoadingMarker = new openlayers.Marker(latlon, identifyIconLoading);
            identifyLayer.addMarker(identifyLoadingMarker);
            identifyLoadingMarker.icon.imageDiv.id = 'vectorIdentify';
        },

        hideIdentify: function () {
            identifyLayer.clearMarkers();
        }
    };
});