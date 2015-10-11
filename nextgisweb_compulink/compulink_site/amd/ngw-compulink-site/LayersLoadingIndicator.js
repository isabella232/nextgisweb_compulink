define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/html',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-attr',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/LayersLoadingIndicator.mustache',
    'xstyle/css!./templates/css/LayersLoadingIndicator.css'
], function (declare, query, array, lang, html, domConstruct, domStyle, domAttr, _Widget,
             _TemplatedMixin, _WidgetsInTemplateMixin, Dialog, on, mustache, template) {
    return declare([], {
        openLayersMap: null,
        domElement: null,
        domLoaded: null,
        loading: {
            count: 0,
            layers: {}
        },

        constructor: function (map) {
            this.openLayersMap = map.olMap;
            this._buildElementIndicator();
            this._bindEvents();
        },

        _buildElementIndicator: function () {
            var viewPortDiv = this.openLayersMap.viewPortDiv;
            this.domElement = domConstruct.place(mustache.render(template), viewPortDiv);
            this.domLoaded = query('span', this.domElement)[0];
        },

        _bindEvents: function () {
            this.openLayersMap.events.register('addlayer', this.openLayersMap, lang.hitch(this, function (e) {
                var layer = e.layer;
                this._layerBindEvents(layer);
                this._increaseLayersCount();
                this.loading.layers[layer.id] = true;
                this._setPercent();
            }));

            this.openLayersMap.events.register('removelayer', this.openLayersMap, lang.hitch(this, function (e) {
                var layer = e.layer;
                if (this.loading.layers.hasOwnProperty(layer.id)) {
                    delete this.loading.layers[layer.id];
                    this._decreaseLayersCount();
                    this._setPercent();
                }
            }));
        },

        _layerBindEvents: function (layer) {
            layer.events.register('loadstart', '', lang.hitch(this, function (e) {
                var layer = e.object;
                this._increaseLayersCount();
                this.loading.layers[layer.id] = true;
                this._setPercent();
            }));

            layer.events.register('loadend', '', lang.hitch(this, function (e) {
                var layer = e.object;
                if (this.loading.layers.hasOwnProperty(layer.id)) {
                    delete this.loading.layers[layer.id];
                    this._decreaseLayersCount();
                    this._setPercent();
                }
            }));
        },

        _getCountLayers: function () {
            var layers = this.openLayersMap.layers,
                countLayers = layers.length,
                countDataLayers = 0;

            for (var i = 0; i < countLayers; i++) {
                if (!layers[i].isBaseLayer) {
                    countDataLayers++;
                }
            }

            return countDataLayers;
        },

        _decreaseLayersCount: function () {
            this.loading.count--;
            if (this.loading.count < 0) {
                this.loading.count = 0;
            }
        },

        _increaseLayersCount: function () {
            this.loading.count++;
        },

        _setPercent: function () {
            var percent,
                loadingCount = this.loading.count,
                countAllLayers = this._getCountLayers();

            if (loadingCount == 0) {
                percent = 100;
            } else {
                percent = Math.round((countAllLayers - loadingCount) / countAllLayers * 100);
            }

            percent = percent.toString();
            domStyle.set(this.domLoaded, 'width', percent + '%');
            domAttr.set(this.domElement, 'title', 'Загружено ' + percent + '% данных')
        }
    });
});