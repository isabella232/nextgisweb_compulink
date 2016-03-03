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
        },

        postCreate: function () {
            this._bindEvents();
        },

        _toggleButtonOn: null,
        _bindEvents: function () {
            var toolbar = registry.byId('editorToolbar'),
                toolbarChildren = toolbar.getChildren(),
                isToggleButton, context;

            array.forEach(toolbarChildren, function (toolbarChildrenControl) {
                context = this;
                on(toolbarChildrenControl, 'click', function () {
                    isToggleButton = this instanceof ToggleButton;
                    topic.publish('/compulink/panel/editor/activate');
                    if (isToggleButton) {
                        if (this.get('checked')) {
                            if (context._toggleButtonOn) {
                                context._toggleButtonOn.set('checked', false);
                            }
                            context._toggleButtonOn = this;
                            topic.publish('/compulink/editor/mode/set/', this.editorMode);
                        } else {
                            context._deactivateToolbar();
                        }
                    }
                });
            }, this);

            topic.subscribe('/compulink/panel/common-tools/activate', lang.hitch(this, function () {
                this._deactivateToolbar();
            }));

            this._toggleButtonOn = registry.byId('selectAndMoveButton');
        },

        _deactivateToolbar: function () {
            if (this._toggleButtonOn) {
                this._toggleButtonOn.set('checked', false);
            } else {
                return false;
            }
            topic.publish('/compulink/editor/mode/set/', 'off');
            this._toggleButtonOn = null;
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

        },

        undoAll: function () {
            topic.publish('/compulink/editor/lines/update');
        }
    });
});