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
             webmapSettings) {

    var IdentifyPopup = declare([BorderContainer], {
        style: "width: 100%; height: 100%",
        gutters: false,

        postCreate: function () {
            this.inherited(arguments);

            this.selectOptions = [];

            var layersOrdered = IdentifyPopup.getLayersOrdered(this.layersManager),
                layerId, layerOrderedItem, layerResponse, idx;

            for (var i = 0, layersCount = layersOrdered.length; i < layersCount; i++) {
                layerOrderedItem = layersOrdered[i];
                layerId = layerOrderedItem.id;
                layerResponse = this.response[layerId];
                idx = 0;

                array.forEach(layerResponse.features, function (feature) {
                    var label = put("div[style=\"overflow: hidden; display: inline-block; text-align: left;\"] $ span[style=\"color: gray\"] $ <",
                        layerOrderedItem.layerName + ': ',
                        (feature.label || "#" + feature.id),
                        " (" + feature.parent + ")");
                    domStyle.set(label, "width", (this.popupSize[0] - 30) + "px");
                    this.selectOptions.push({
                        label: label.outerHTML,
                        value: layerId + "/" + idx
                    });

                    feature.layerType = layerOrderedItem.lt;

                    idx++;
                }, this);
            }

            this.selectPane = new BorderContainer({
                region: "top", layoutPriority: 1,
                design: "sidebar",
                style: "padding: 0; height: 26px; margin: 1px;"
            });
            this.addChild(this.selectPane, "ngwWebmapToolIdentify-controller");

            this.select = new Select({
                options: this.selectOptions,
                id: "featureSelector",
                style: "width: 100%; height: 24px;",
                region: "center"
            }).placeAt(this.selectPane);

            // создаем виждеты для всех расширений IFeatureLayer
            var deferreds = [];
            var widget = this;

            widget.extWidgetClasses = {};

            array.forEach(Object.keys(featureLayersettings.extensions), function (key) {
                var ext = featureLayersettings.extensions[key];

                if (key == "attachment") {
                    ext = "ngw-compulink-site/tool/attachments/FotoDisplayWidget";
                    var deferred = new Deferred();
                    deferreds.push(deferred);

                    require([ext], function (cls) {
                        widget.extWidgetClasses["foto_attache"] = cls;
                        deferred.resolve(widget);
                    });

                    ext = "ngw-compulink-site/tool/attachments/DocDisplayWidget";
                    deferred = new Deferred();
                    deferreds.push(deferred);

                    require([ext], function (cls) {
                        widget.extWidgetClasses["doc_attache"] = cls;
                        deferred.resolve(widget);
                    });

                }
                else {
                    var deferred = new Deferred();
                    deferreds.push(deferred);

                    require([ext], function (cls) {
                        widget.extWidgetClasses[key] = cls;
                        deferred.resolve(widget);
                    });
                }
            }, this);

            this.extWidgetClassesDeferred = all(deferreds);
        },

        startup: function () {
            this.inherited(arguments);

            var widget = this;

            this.select.watch("value", function (attr, oldVal, newVal) {
                widget._displayFeature(widget._featureResponse(newVal));
            });
            this._displayFeature(this._featureResponse(this.select.get("value")));
        },

        _featureResponse: function (selectValue) {
            var keys = selectValue.split("/");
            return this.response[keys[0]].features[keys[1]];
        },

        _displayFeature: function (feature) {
            var widget = this,
                layerId = feature.layerId,
                featureId = feature.id;

            var iurl = route.feature_layer.feature.item({id: layerId, fid: featureId});

            xhr.get(iurl, {
                method: "GET",
                handleAs: "json"
            }).then(function (feature) {
                widget.extWidgetClassesDeferred.then(function () {
                    if (widget.featureContainer) {
                        widget.featureContainer.destroyRecursive();
                    }

                    widget.featureContainer = new BorderContainer({region: "center", gutters: false});
                    widget.addChild(widget.featureContainer);

                    widget.extContainer = new TabContainer({
                        region: "center", class: "ngwWebmapToolIdentify-tabContainer"
                    });

                    widget.featureContainer.addChild(widget.extContainer);

                    //widget.extController = new StackController({
                    //    region: "top", layoutPriority: 2,
                    //    containerId: widget.extContainer.id
                    //});
                    //domClass.add(widget.extController.domNode, "ngwWebmapToolIdentify-controller");

                    //widget.featureContainer.addChild(widget.extController);

                    // Показываем виджет с атрибутами в том случае, если
                    // это не отключено в настройках
                    if (featureLayersettings.identify.attributes) {
                        var fwidget = new FieldsDisplayWidget({
                            resourceId: layerId,
                            featureId: featureId,
                            compact: true,
                            aliases: true, grid_visibility: true
                        });

                        fwidget.renderValue(feature.fields);

                        var fw_wrapper = new ContentPane({
                            title: "Атрибуты",
                            style: "margin: 0px; padding: 0px"
                        });
                        fw_wrapper.addChild(fwidget);

                        fw_wrapper.placeAt(widget.extContainer);
                    }

                    array.forEach(Object.keys(widget.extWidgetClasses), function (key) {

                        ext_key = key;
                        if (key == "foto_attache" || key == "doc_attache") {
                            ext_key = "attachment";
                        }
                        var cls = widget.extWidgetClasses[key];
                        var ewidget = new cls({
                            resourceId: layerId,
                            featureId: featureId,
                            compact: true
                        });

                        ewidget.renderValue(feature.extensions[ext_key]);
                        ewidget.placeAt(widget.extContainer);
                    });


                    setTimeout(function () {
                        widget.resize();
                    }, 10);

                }).otherwise(console.error);
            }).otherwise(console.error);
        }
    });

    IdentifyPopup.getLayersOrdered = function (layersManager) {
        var layersOrdered = [],
            layersByVectorId = layersManager.LayersByVectorId,
            layer, vector_id;

        for (vector_id in layersByVectorId) {
            if (layersByVectorId.hasOwnProperty(vector_id)) {
                layer = layersByVectorId[vector_id];
                layersOrdered.push({
                    id: vector_id,
                    z: layersManager.LayersConfig[layer.layer_type].order,
                    lt: layer.layer_type,
                    layerName: layersManager.LayersConfig[layer.layer_type].identify_text
                });
            }
        }

        layersOrdered.sort(function (a, b) {
            return b.z - a.z;
        });

        return layersOrdered;
    };

    return IdentifyPopup;
});