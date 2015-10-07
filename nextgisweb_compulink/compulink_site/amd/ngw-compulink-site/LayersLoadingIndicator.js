define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/html',
    'dojo/dom-construct',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/LayersLoadingIndicator.mustache',
    'xstyle/css!./templates/css/LayersLoadingIndicator.css'
], function (declare, query, array, lang, html, domConstruct, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
             Dialog, on, mustache, template) {
    return declare([], {
        openLayersMap: null,
        domElement: null,
        domLoaded: null,
        countLoaded: 0,

        constructor: function (map) {
            this.openLayersMap = map.olMap;
            this._buildElementIndicator();
        },

        _buildElementIndicator: function () {
            var viewPortDiv = this.openLayersMap.viewPortDiv;
            this.domElement = domConstruct.place(mustache.render(template), viewPortDiv);
            this.domLoaded = query('span.loaded', this.domElement)[0];
        },

        _bindEvents: function () {
            this.openLayersMap.events.register('addlayer', this.openLayersMap, lang.hitch(this, function (layer) {
                this._layerBindEvents(layer);
            }));

            this.openLayersMap.events.register('removelayer', this.openLayersMap, lang.hitch(this, function (layer) {
            }));
        },

        _layerBindEvents: function (layer) {
            this.openLayersMap.events.register('loadstart', layer, lang.hitch(this, function () {

            }))
        },

        _getCountLayers: function () {
            return this.openLayersMap.getNumLayers();
        },

        _setPercent: function () {
            html.set(this.domLoaded, Math.round(this.countLoaded / this._getCountLayers() * 100).toString());
        }
    });
});