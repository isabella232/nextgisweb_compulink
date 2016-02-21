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
    'dijit/registry',
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
], function (declare, lang, array, html, dom, on, query, domClass, domConstruct, all, topic, registry,
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

        createSp: function () {
            var checked = registry.byId('createSpButton').get('checked');
            if (checked) {
                registry.byId('createVolsButton').set('checked', false);
                topic.publish('/compulink/editor/set/mode/', 'createSp');
            } else {
                topic.publish('/compulink/editor/set/mode/', 'edit');
            }
        },

        createVols: function () {
            var checked = registry.byId('createVolsButton').get('checked');
            if (checked) {
                registry.byId('createSpButton').set('checked', false);
                topic.publish('/compulink/editor/set/mode/', 'createVols');
            } else {
                topic.publish('/compulink/editor/set/mode/', 'edit');
            }
        },

        updateLines: function () {
            topic.publish('/compulink/editor/lines/update');
        }
    });
});