define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/request/xhr',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/json',
    'dijit/Menu',
    'dijit/MenuItem',
    'ngw/route',
    'ngw-compulink-site/tool/DeviationIdentifyControl',
    './Identify',
    './IdentifyPopup'
], function (declare, array, xhr, lang, domConstruct, json,
             Menu, MenuItem, route, DeviationIdentifyControl,
             Identify, IdentifyPopup) {
    return declare(Identify, {
        constructor: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl = new DeviationIdentifyControl({
                tool: this,
                olMap: this.display.map.olMap
            });
            this.display.map.olMap.addControl(this.deviationIndentifyControl);
        },

        activate: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl.activate();
        },

        deactivate: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl.deactivate();
        },

        rightClickDeviation: function (pixel) {
            var olMap = this.display.map.olMap,
                point = olMap.getLonLatFromPixel(pixel),
                request,
                layersInfoIdentify,
                layersLabels,
                isIdentifyActive = true;

            this._addIdentifyLoadingMarker(point);

            layersInfoIdentify = this._getLayersInfoIdentify();
            layersLabels = this._getLayersLabel(layersInfoIdentify);

            request = {
                srs: 3857,
                geom: this._requestGeomString([pixel.x, pixel.y]),
                layers: layersInfoIdentify
            };

            xhr.post(route("compulink.deviation.identify"), {
                handleAs: "json",
                data: json.stringify(request)
            }).then(lang.hitch(this, function (response) {
                isIdentifyActive = false;
                this._clearIdentifyLayer();
                var marker = this._addIdentifyMarker(point);
                this._buildDeviationsMenu(response, layersLabels, marker.icon.imageDiv);
            }), lang.hitch(this, function (err) {
                console.log(err);
                this._clearIdentifyLayer();
            }));
        },

        _buildDeviationsMenu: function (response, layersLabels, div) {
            var layersOrdered, layerId, layerOrderedItem,
                layerResponse, idx, node, deviationMenu,
                menuItemLabel;

            node = domConstruct.create('div', {
                'class': 'identify-deviation-menu'
            }, div);
            deviationMenu = new Menu({}, node);

            layersOrdered = IdentifyPopup.getLayersOrdered(this.layersManager);
            for (var i = 0, layersCount = layersOrdered.length; i < layersCount; i++) {
                layerOrderedItem = layersOrdered[i];
                layerId = layerOrderedItem.id;
                layerResponse = response[layerId];
                idx = 0;
                array.forEach(layerResponse.features, function (feature) {
                    menuItemLabel = layerOrderedItem.layerName + ': ' +
                        (feature.label || "#" + feature.id) +
                        " (" + feature.parent + ")";

                    deviationMenu.addChild(new MenuItem({
                        label: menuItemLabel
                    }));

                    idx++;
                }, this);
            }

            deviationMenu.startup();
        }
    });
});