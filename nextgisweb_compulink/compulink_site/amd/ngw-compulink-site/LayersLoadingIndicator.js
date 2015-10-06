define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
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
        domAll: null,

        constructor: function (map) {
            this.openLayersMap = map.olMap;
            this._buildElementIndicator();
            this._bindEvents();
        },

        _buildElementIndicator: function () {
            var viewPortDiv = this.openLayersMap.viewPortDiv;
            this.domElement = domConstruct.place(mustache.render(template), viewPortDiv);
            this.domLoaded = query('span.loaded', this.domElement)[0];
            this.all = query('span.all', this.domElement)[0];
        },

        _bindEvents: function () {
            this.openLayersMap.events.register('addlayer', this.openLayersMap, function (layer) {

            });

            this.openLayersMap.events.register('removelayer', this.openLayersMap, function (layer) {

            });
        }
    });
});