define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/aspect',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/request/xhr',
    'dojo/date/locale',
    'dijit/registry',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'dojox/layout/TableContainer',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'ngw-compulink-libs/mustache/mustache',
    'ngw/openlayers/Map',
    'ngw/openlayers',
    'dojo/text!./templates/PrintMap.html',
    'xstyle/css!./templates/css/PrintMap.css'
], function (declare, query, aspect, domStyle, domClass, Deferred, domConstruct, array, lang, html, xhr, locale, registry,
             _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, Dialog, on, TableContainer,
             TextBox, NumberTextBox, mustache, Map, openlayers, template) {
    var widget = declare([Dialog], {
        id: 'printMapDialog',
        title: 'Печать карты',
        isDestroyedAfterHiding: true,
        isClosedAfterButtonClick: true,
        template: template,
        printElementId: 'printMap',
        printElement: null,
        printElementMap: null,
        printMap: null,
        style: 'width: 100%; height: 100%;',

        constructor: function (settings) {
            lang.mixin(this, settings);

            var contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
                id: 'printMapContent',
                templateString: template,
                message: this.message,
                buttonOk: this.buttonOk,
                buttonCancel: this.buttonCancel,
                style: 'width: 100%; height: 100%;',
                func: function () {
                }
            }));

            contentWidget.startup();
            this.content = contentWidget;
        },

        postCreate: function () {
            this.inherited(arguments);

            on(this.content.okButton, 'click', lang.hitch(this, function () {
                window.print();
            }));

            on(this.content.cancelButton, 'click', lang.hitch(this, function () {
                this.hide();
            }));

            on(this.content.sizesSelect, 'change', lang.hitch(this, function () {
                var sizeValues = this.content.sizesSelect.get('value'),
                    parsedSizeValues, height, width;
                if (sizeValues === 'custom') {

                } else {
                    parsedSizeValues = sizeValues.split('_');
                    width = parsedSizeValues[0];
                    height = parsedSizeValues[1];
                    this.content.heightInput.set('value', height);
                    this.content.widthInput.set('value', width);
                    this._resizeMapContainer(width, height);
                }
            }));

            aspect.after(this, 'hide', lang.hitch(this, function () {
                this.printMap.olMap.destroy();
                domClass.add(this.printElement, 'inactive');
                this._removePageStyle();
                this.destroyRecursive();
            }));
        },

        show: function () {
            this.inherited(arguments);
            this._buildPrintElement();
            this._buildMap();
            this.content.sizesSelect.attr('value', '210_297');
        },

        _buildPrintElement: function () {
            var printElement = document.getElementById(this.printElementId);
            if (printElement === null) {
                var node = domConstruct.toDom('<div id="' + this.printElementId + '"><div class="map-container"></div></div>');
                this.printElement = domConstruct.place(node, document.body, 'last');
                this.printElementMap = query('div.map-container', this.printElement)[0];
            } else {
                domConstruct.empty(query('div.map-container', this.printElement)[0]);
                domClass.remove(printElement, 'inactive');
                this.printElement = printElement;
            }
        },

        _buildMap: function () {
            var mapContainer = query('div.map-container', this.printElement)[0],
                clonedLayer;
            this.printMap = new Map(mapContainer, {
                controls: []
            });

            aspect.after(mapContainer, 'resize', lang.hitch(this, function () {
                this.printMap.olMap.updateSize();
            }));

            array.forEach(this.map.layers, function (layer) {
                clonedLayer = layer.clone();
                layer.setZIndex(100);
                clonedLayer.map = null;
                this.printMap.olMap.addLayer(clonedLayer);
            }, this);

            this.printMap.olMap.zoomToExtent(this.map.getExtent(), true);
        },

        _resizeMapContainer: function (width, height) {
            var mapContainer = query('div.map-container', this.printElement)[0];

            domStyle.set(mapContainer, {
                height: height + 'mm',
                width: width + 'mm'
            });

            domStyle.set(this.printElement, {
                width: width + 'mm'
            });

            this.printMap.olMap.updateSize();
            this.printMap.olMap.zoomToExtent(this.map.getExtent(), true);
            this._buildPageStyle(width, height);
        },

        _buildPageStyle: function (width, height) {
            var style = this._getPageStyle(),
                margin = this.content.marginInput.get('value');
            if (style.sheet.cssRules.length > 0) {
                style.sheet.deleteRule(0);
            }
            style.sheet.insertRule('@page {size:' + width + 'mm ' + height + 'mm; margin: ' + margin + 'mm;}', 0);
        },

        _pageStyle: null,
        _getPageStyle: function () {
            if (this._pageStyle) {
                return this._pageStyle;
            }
            var style = document.createElement('style');
            style.appendChild(document.createTextNode(''));
            document.head.appendChild(style);
            this._pageStyle = style;
            return style;
        },

        _removePageStyle: function () {
            if (this._pageStyle) {
                domConstruct.destroy(this._pageStyle);
            }
        }
    });

    return {
        run: function (olMap) {
            var editor = new widget({
                map: olMap
            });
            editor.show();
        }
    }
});