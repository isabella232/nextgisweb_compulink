/*global console, OpenLayers*/
define([
    "dojo/_base/declare",
    "ngw-webmap/tool/Base",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/json",
    "dojo/request/xhr",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dijit/Dialog",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/StackContainer",
    "dijit/layout/StackController",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/layout/TabContainer",
    "dijit/registry",
    "put-selector/put",
    "ngw/route",
    "ngw/openlayers",
    "ngw/openlayers/Popup",
    "./FieldsDisplayWidget",
    "./FeatureEditorWidget",
    // settings
    "ngw/settings!feature_layer",
    "ngw-compulink-site/tool/IdentifyPopup",
    "ngw/settings!webmap",
    // css
    "xstyle/css!./resource/Identify.css",
    "ngw-compulink-site/tool/attachments/FotoDisplayWidget",
    "ngw-compulink-site/tool/attachments/DocDisplayWidget"
], function (declare,
             Base,
             lang,
             array,
             Deferred,
             all,
             json,
             xhr,
             dom,
             domClass,
             domStyle,
             on,
             Dialog,
             BorderContainer,
             ContentPane,
             StackContainer,
             StackController,
             Select,
             Button,
             TabContainer,
             registry,
             put,
             route,
             openlayers,
             Popup,
             FieldsDisplayWidget,
             FeatureEditorWidget,
             featureLayersettings,
             IdentifyPopup,
             webmapSettings) {
    var Control = OpenLayers.Class(OpenLayers.Control, {
        initialize: function (options) {
            OpenLayers.Control.prototype.initialize.apply(this, [options]);

            this.handler = new OpenLayers.Handler.Click(this, {
                click: this.clickCallback
            });
        },

        clickCallback: function (evt) {
            this.tool.execute([evt.xy.x, evt.xy.y]);
        }
    });

    var layersTypesById = {};
    function parseLayersInfo (layersInfo) {
        if (layersInfo.constructor !== Array) return false;
        array.forEach(layersInfo, function (layersInfoItem) {
            if (layersInfoItem.children) {
                parseLayersInfo(layersInfoItem.children)
            } else {
                layersTypesById[layersInfoItem.id] = layersInfoItem;
            }
        });
    }
    parseLayersInfo(focl_layers_type);
    parseLayersInfo(sit_plan_layers_type);

    var identifyLayerName = 'identifyMarkers',
        identifyLayer = new OpenLayers.Layer.Markers(identifyLayerName);

    return declare(Base, {
        label: "Информация об объекте",
        iconClass: "iconIdentify",

        identifyIconLoading: new OpenLayers.Icon(
            ngwConfig.compulinkAssetUrl + 'img/identify-loading.svg',
            new OpenLayers.Size(40,40)),
        identifyIcon: new OpenLayers.Icon(
            ngwConfig.compulinkAssetUrl + 'img/identify-icon.png',
            new OpenLayers.Size(16,16)),

        // Радиус для поиска объектов в пикселях
        pixelRadius: webmapSettings.identify_radius,

        // Ширина popup
        popupWidth: webmapSettings.popup_width,

        // Высота popup,
        popupHeight: webmapSettings.popup_height,

        constructor: function () {
            this.map = this.display.map;
            this.layersManager = this.display.LayersManager;

            this.control = new Control({tool: this});
            this.display.map.olMap.addControl(this.control);
        },

        activate: function () {
            this.control.activate();
        },

        deactivate: function () {
            this.control.deactivate();
            this._clearControls();
        },

        _clearControls: function () {
            this._removePopup();
            this._clearIdentifyLayer();
        },

        execute: function (pixel) {
            var olMap = this.display.map.olMap,
                point = olMap.getLonLatFromPixel(new OpenLayers.Pixel(pixel[0], pixel[1])),
                request,
                layersInfoIdentify,
                layersLabels,
                isIdentifyActive = true;

            this._addIdentifyLoadingMarker(point);

            layersInfoIdentify = this._getLayersInfoIdentify();
            layersLabels = this._getLayersLabel(layersInfoIdentify);

            request = {
                srs: 3857,
                geom: this._requestGeomString(pixel),
                layers: layersInfoIdentify
            };

            xhr.post(route("feature_layer.identify"), {
                handleAs: "json",
                data: json.stringify(request)
            }).then(lang.hitch(this, function (response) {
                isIdentifyActive = false;
                this._clearIdentifyLayer();
                this._responsePopup(response, point, layersLabels);
            }), lang.hitch(this, function (err) {
                console.log(err);
                this._clearIdentifyLayer();
            }));
        },

        _requestGeomString: function (pixel) {
            var olMap = this.map.olMap,
                bounds = new openlayers.Bounds();
            bounds.extend(olMap.getLonLatFromPixel({x: pixel[0] - this.pixelRadius, y: pixel[1] - this.pixelRadius}));
            bounds.extend(olMap.getLonLatFromPixel({x: pixel[0] + this.pixelRadius, y: pixel[1] + this.pixelRadius}));
            return bounds.toGeometry().toString();
        },

        _getLayersInfoIdentify: function () {
            var vectorsIds = [],
                mapLayers = this.display.map.layers,
                layersInfoIdentify = [],
                layerName,
                layer;

            for (layerName in mapLayers) {
                if (mapLayers.hasOwnProperty(layerName)) {
                    layer = this.display.map.layers[layerName];
                    if (layer.vectors_ids) {
                        vectorsIds = layer.vectors_ids.split(',');
                        array.forEach(vectorsIds, function (vectorId) {
                            layersInfoIdentify.push(vectorId);
                        }, this);
                    }
                }
            }

            return layersInfoIdentify;
        },

        _getLayersLabel: function (layersInfoIdentify) {
            var layerLabels = {};
            array.forEach(layersInfoIdentify, function (i) {
                layerLabels[i] = i;
            });
        },

        _removePopup: function () {
            if (this._popup) {
                this._popup.widget.select.closeDropDown(true);
                this._popup.widget.destroyRecursive();
                this.map.olMap.removePopup(this._popup);
                this._popup = null;
            }
        },

        _responsePopup: function (response, point, layerLabels) {
            this._clearControls();

            if (!response.featureCount || response.featureCount === 0) {
                return false;
            }

            this._addIdentifyMarker(point);

            this._popup = new Popup({
                title: "Информация об объекте",
                point: point,
                size: [this.popupWidth, this.popupHeight]
            });

            var widget = new IdentifyPopup({
                response: response,
                layersManager: this.layersManager,
                tool: this,
                layerLabels: layerLabels,
                popupSize: [this.popupWidth, this.popupHeight]
            });
            this._popup.widget = widget;

            widget.placeAt(this._popup.contentDiv).startup();

            this.map.olMap.addPopup(this._popup);
            widget.resize();

            // Обработчик закрытия
            on(this._popup._closeSpan, "click", lang.hitch(this, function () {
                this._clearControls();
            }));
        },

        _clearIdentifyLayer: function () {
            identifyLayer.clearMarkers();
        },

        _addIdentifyLayer: function () {
            var olMap = this.display.map.olMap;
            if (olMap.getLayersByName(identifyLayerName).length === 0) {
                olMap.addLayer(identifyLayer);
            }
            olMap.setLayerIndex(identifyLayer, 9999);
        },

        _addIdentifyLoadingMarker: function (point) {
            var icon, marker;
            icon = new OpenLayers.Icon(ngwConfig.compulinkAssetUrl + 'img/identify-loading.svg',
                new OpenLayers.Size(40, 40));
            marker = new OpenLayers.Marker(point, icon);
            this._addIdentifyLayer();
            identifyLayer.addMarker(marker);
            return marker;
        },

        _addIdentifyMarker: function (point) {
            var icon, marker;
            icon = new OpenLayers.Icon(ngwConfig.compulinkAssetUrl + 'img/identify-icon.png',
                new OpenLayers.Size(16, 16));
            marker = new OpenLayers.Marker(point, icon);
            this._addIdentifyLayer();
            identifyLayer.addMarker(marker);
            return marker;
        }
    });
});
