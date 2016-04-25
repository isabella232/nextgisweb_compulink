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
    'dijit/focus',
    'dijit/registry',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw/settings!compulink_site',
    'ngw-compulink-site/InfoDialog',
    'dijit/Toolbar',
    'dijit/form/ToggleButton',
    'dijit/form/Button',
    'dojo/text!./templates/StatisticToolbar.html',
    'xstyle/css!./templates/css/StatisticToolbar.css'
], function (declare, lang, array, html, dom, on, query, domClass, domConstruct, all, topic, focus, registry,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             siteSettings, InfoDialog, Toolbar, ToggleButton, Button, statisticToolbarTemplate) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: statisticToolbarTemplate,
        widgetsInTemplate: true,
        region: 'top',

        constructor: function () {
        },

        postCreate: function () {
            this._bindEvents();
        },

        _toggleButtonOn: null,
        _bindEvents: function () {
            var toolbar = registry.byId('statisticToolbar'),
                toolbarChildren = toolbar.getChildren(),
                isToggleButton, context;

            array.forEach(toolbarChildren, function (toolbarChildrenControl) {
                context = this;
                on(toolbarChildrenControl, 'click', function () {
                    isToggleButton = this instanceof ToggleButton;
                    if (isToggleButton) {
                        if (this.get('checked')) {
                            if (context._toggleButtonOn) {
                                context._toggleButtonOn.set('checked', false);
                            }
                        }
                    }
                });
            }, this);

            this._toggleButtonOn = registry.byId('selectAndMoveButton');
        },

        selectAndMoveChanged: function (val) {
            registry.byId('undoOneButton').set('disabled', !val);
            registry.byId('removeFeatureButton').set('disabled', !val);
        },

        removeFeature: function () {
            topic.publish('/compulink/editor/features/remove');
        },

        createSp: function () {
            var toolbar = registry.byId('editorToolbar'),
                v = toolbar.getChildren()[1] instanceof ToggleButton,
                checked = registry.byId('createSpButton').get('checked');
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
        },

        undoOne: function () {
            topic.publish('/compulink/editor/features/undo');
        },

        undoAll: function () {
            topic.publish('/compulink/editor/features/undo_all');
        }
    });
});