define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'dojo/text!./templates/LayersLoadingIndicator.html'
], function (declare, query, array, lang, html, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, Dialog, on,
             template) {
    return declare([], {
        openLayersMap: null,

        constructor: function (map) {
            this.openLayersMap = map.olMap;

            this._bindEvents();

            var viewPortDiv = this.openLayersMap.viewPortDiv;
        },

        _bindEvents: function () {
            this.openLayersMap.events.register('addlayer', this.openLayersMap, function (i) {

            });
            this.openLayersMap.events.register('removelayer', this.openLayersMap, function (i) {

            });
        }
    });
});