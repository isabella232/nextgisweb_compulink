define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/html',
    'dojo/dom',
    'dojo/on',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/promise/all',
    'dojo/topic',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw/settings!compulink_site',
    'ngw-compulink-site/InfoDialog',
    'dijit/Toolbar',
    'dijit/form/ToggleButton',
    'dijit/form/Button',
    'dojo/text!./templates/EditorToolbar.html',
    'xstyle/css!./templates/css/EditorToolbar.css'
], function (declare, lang, array, html, dom, on, query, domClass, domConstruct, all, topic,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             siteSettings, InfoDialog, Toolbar, ToggleButton, Button, editorToolbarTemplate) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: editorToolbarTemplate,
        widgetsInTemplate: true,
        region: 'top',

        constructor: function () {
            this.bindEvents();
        },

        bindEvents: function () {

        },

        removeFeature: function () {
            topic.publish('/compulink/editor/features/remove');
        },

        createSp: function (val) {
            if (val) {
                registry.byId("createVolsButton").set('checked', false);
                topic.publish('/compulink/editor/mode/draw', 'sp');
                this._setMapCrosshairClass();
            } else {
                this._removeMapCrosshairClass();
                topic.publish('/compulink/editor/mode/draw', null);
            }

        },

        createVols: function (val) {
            if (val) {
                registry.byId("createSpButton").set('checked', false);
                topic.publish('/compulink/editor/mode/draw', 'vols');
                this._setMapCrosshairClass();
            } else {
                topic.publish('/compulink/editor/mode/draw', null);
                this._removeMapCrosshairClass();
            }
        },

        _classCrosshair: "cursor-crosshair",
        _setMapCrosshairClass: function () {
            if (!domClass.contains(this.map.olMap.div, this._classCrosshair)) {
                domClass.add(this.map.olMap.div, this._classCrosshair);
            }
        },

        _removeMapCrosshairClass: function () {
            if (registry.byId("createVolsButton").get('checked') ||
                registry.byId("createSpButton").get('checked')) {
                return false;
            }
            domClass.remove(this.map.olMap.div, this._classCrosshair);
        }
    });
});