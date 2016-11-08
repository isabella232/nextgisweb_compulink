define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'dojo/html',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-compulink-accepted-part/ui/AcceptedPartsTable/AcceptedPartsTable',
    'dojo/text!./AcceptedPartsPanel.html',
    'xstyle/css!./css/fontello/css/fontello.css',
    'xstyle/css!./css/AcceptedPartsPanel.css'
], function (declare, lang, query, on, topic, html, domAttr, domClass,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             AcceptedPartsTable, template) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        postCreate: function () {
            this._bindAcceptedPartsPanelEvents();
        },

        _bindAcceptedPartsPanelEvents: function () {
            on(this.acceptedPartsLayerToggle, 'change', lang.hitch(this, function (state) {
                if (state) {
                    this.acceptedPartsLayerToggle.set('iconClass', 'icon icon-eye');
                    this.createAcceptedPartToggle.set('disabled', false);
                } else {
                    this.acceptedPartsLayerToggle.set('iconClass', 'icon icon-eye-off');
                    this.createAcceptedPartToggle.set('disabled', 'disabled');
                }
                topic.publish('compulink/accepted-parts/ui/layer/visibility/changed', state);
            }));

            on(this.createAcceptedPartToggle, 'change', lang.hitch(this, function (state) {
                topic.publish('compulink/accepted-parts/ui/create-new-accepted-part/changed', state);
            }));

            topic.subscribe('/table/construct_object/selected', lang.hitch(this, function (constructObjectInfo) {
                this.acceptedPartsLayerToggle.set('disabled', false);
            }));

            topic.subscribe('/table/construct_object/data/changed', lang.hitch(this, function (store) {
                this.acceptedPartsLayerToggle.set('disabled', 'disabled');
                this.createAcceptedPartToggle.set('disabled', 'disabled');
            }));
        }
    });
});