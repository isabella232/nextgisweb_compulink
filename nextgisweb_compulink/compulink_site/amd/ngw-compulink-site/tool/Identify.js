/*global console, OpenLayers*/
define([
    "dojo/_base/declare",
    "webmap/tool/Base",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/json",
    "dojo/request/xhr",
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
    "xstyle/css!./resource/Identify.css"
], function (
    declare,
    Base,
    lang,
    array,
    Deferred,
    all,
    json,
    xhr,
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
    webmapSettings
) {
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

    var Widget = declare([BorderContainer], {
        style: "width: 100%; height: 100%",
        gutters: false,

        postCreate: function () {
            this.inherited(arguments);

            this.selectOptions = [];

            array.forEach(Object.keys(this.response), function (layerId) {
                var layerResponse = this.response[layerId];
                var idx = 0;
                array.forEach(layerResponse.features, function (feature) {
                    var label = put("div[style=\"overflow: hidden; display: inline-block; text-align: left;\"] $ span[style=\"color: gray\"] $ <", (feature.label || "#" + feature.id), " (" + feature.parent + ")");
                    domStyle.set(label, "width", (this.popupSize[0] - 65) + "px");
                    this.selectOptions.push({
                        label: label.outerHTML,
                        value: layerId + "/" + idx
                    });
                    idx++;
                }, this);
            }, this);

            this.selectPane = new BorderContainer({
                region: "top", layoutPriority: 1,
                design: "sidebar",
                style: "padding: 0; height: 20px; margin: 1px"
            });
            this.addChild(this.selectPane, "ngwWebmapToolIdentify-controller");

            this.select = new Select({
                options: this.selectOptions,
                id: "featureSelector",
                style: "width: 100%",
                region: "center"
            }).placeAt(this.selectPane);


            this.editButton = new Button({
                        region: "right",
                        iconClass: "dijitIconEdit",
                        style: "height: 20px;",
                        showLabel: true,
                        onClick: function () {
                            xhr(route.resource.item({id: ident_lid}), {
                                method: "GET",
                                handleAs: "json"
                            }).then(function (data) {
                                var fieldmap = {};
                                array.forEach(data.feature_layer.fields, function (itm) {
                                    fieldmap[itm.keyname] = itm;
                                });

                                var label = registry.byId("featureSelector").get("displayedValue");

                                var pane = new FeatureEditorWidget({
                                    resource: ident_lid, feature: ident_fid,
                                    fields: data.feature_layer.fields,
                                    title: label,
                                    iconClass: "iconDescription",
                                    closable: true,
                                    style: "width: 400px; height: 500px"
                                });

                                var FeatureEditorDialog = new Dialog({
                                    title: label,
                                    content: pane
                                });
                                FeatureEditorDialog.show();

                                pane.startup();
                                pane.load();
                            }).otherwise(console.error);
                        }
                    }).placeAt(this.selectPane);
            domClass.add(this.editButton.domNode, "no-label");

            // создаем виждеты для всех расширений IFeatureLayer
            var deferreds = [];
            var widget = this;

            widget.extWidgetClasses = {};

            array.forEach(Object.keys(featureLayersettings.extensions), function (key) {
                var ext = featureLayersettings.extensions[key];

                var deferred = new Deferred();
                deferreds.push(deferred);

                require([ext], function (cls) {
                    widget.extWidgetClasses[key] = cls;
                    deferred.resolve(widget);
                });
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
            var widget = this;
            ident_lid = feature.layerId;
            ident_fid = feature.id;

            var iurl = route.feature_layer.feature.item({id: ident_lid, fid: ident_fid});

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
                        region: "center", class: "ngwWebmapToolIdentify-tabContainer"});

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
                            resourceId: ident_lid, featureId: ident_fid, compact: true,
                            title: "Атрибуты",
                            aliases: true, grid_visibility: true});

                        fwidget.renderValue(feature.fields);
                        fwidget.placeAt(widget.extContainer);
                    }

                    array.forEach(Object.keys(widget.extWidgetClasses), function (key) {
                        var cls = widget.extWidgetClasses[key];
                        var ewidget = new cls({
                            resourceId: ident_lid, featureId: ident_fid,
                            compact: true});

                        ewidget.renderValue(feature.extensions[key]);
                        ewidget.placeAt(widget.extContainer);
                    });

                    //widget.editButton = new Button({
                    //    iconClass: "dijitIconEdit",
                    //    showLabel: true,
                    //    onClick: function () {
                    //        xhr(route.resource.item({id: lid}), {
                    //            method: "GET",
                    //            handleAs: "json"
                    //        }).then(function (data) {
                    //            var fieldmap = {};
                    //            array.forEach(data.feature_layer.fields, function (itm) {
                    //                fieldmap[itm.keyname] = itm;
                    //            });
                    //
                    //            var pane = new FeatureEditorWidget({
                    //                resource: lid, feature: fid,
                    //                fields: data.feature_layer.fields,
                    //                title: "Объект #" + fid,
                    //                iconClass: "iconDescription",
                    //                closable: true,
                    //                style: "width: 400px; height: 500px"
                    //            });
                    //
                    //            var FeatureEditorDialog = new Dialog({
                    //                title: "Объект #" + fid,
                    //                content: pane
                    //            });
                    //            FeatureEditorDialog.show();
                    //
                    //            pane.startup();
                    //            pane.load();
                    //        }).otherwise(console.error);
                    //    }
                    //}).placeAt(widget.extController, "last");
                    //domClass.add(widget.editButton.domNode, "no-label");

                    setTimeout(function () { widget.resize();}, 10);

                }).otherwise(console.error);
            }).otherwise(console.error);
        }
    });

    return declare(Base, {
        label: "Информация об объекте",
        iconClass: "iconIdentify",

        // Радиус для поиска объектов в пикселях
        pixelRadius: webmapSettings.identify_radius,

        // Ширина popup
        popupWidth: webmapSettings.popup_width,

        // Высота popup,
        popupHeight: webmapSettings.popup_height,

        constructor: function () {
            this.map = this.display.map;

            this.control = new Control({tool: this});
            this.display.map.olMap.addControl(this.control);
        },

        activate: function () {
            this.control.activate();
        },

        deactivate: function () {
            this.control.deactivate();

            if (this.popup) {
                this.display.map.olMap.removePopup(this.popup);
                this.popup = null;
            }
        },

        execute: function (pixel) {
            var tool = this,
                olMap = this.display.map.olMap,
                point = olMap.getLonLatFromPixel(new OpenLayers.Pixel(pixel[0], pixel[1]));

            var request = {
                srs: 3857,
                geom: this._requestGeomString(pixel),
                layers: []
            };

            for (var lyr_name in this.display.map.layers) {
                var lyr = this.display.map.layers[lyr_name];
                if (lyr.res_id) {  request.layers.push(lyr.res_id); }
            }

            var layerLabels = {};
                    array.forEach(request.layers, function (i) {
                        layerLabels[i] = i;
                    }, this);

                    // XHR-запрос к сервису
                    xhr.post(route("feature_layer.identify"), {
                        handleAs: "json",
                        data: json.stringify(request)
                    }).then(function (response) {
                        tool._responsePopup(response, point, layerLabels);
                    });


        },

        // WKT-строка геометрии поиска объектов для точки pixel
        _requestGeomString: function (pixel) {
            var olMap = this.map.olMap,
                bounds = new openlayers.Bounds();

            bounds.extend(olMap.getLonLatFromPixel({x: pixel[0] - this.pixelRadius, y: pixel[1] - this.pixelRadius}));
            bounds.extend(olMap.getLonLatFromPixel({x: pixel[0] + this.pixelRadius, y: pixel[1] + this.pixelRadius}));

            return bounds.toGeometry().toString();
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
            // TODO: Проверить, есть ли какой-нибудь результат
            // и показывать popup только если он есть.

            this._removePopup();

            this._popup = new Popup({
                title: "Информация об объекте",
                point: point,
                size: [this.popupWidth, this.popupHeight]
            });

            var widget = new Widget({
                response: response,
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
                this._removePopup();
            }));
        }

    });
});
