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
                    this.createAcceptedPartToggle.attr('checked', false);
                    topic.publish('compulink/accepted-parts/layers/first-point/undo/off');
                }
                topic.publish('compulink/accepted-parts/ui/layer/visibility/changed', state);
            }));

            on(this.createAcceptedPartToggle, 'change', lang.hitch(this, function (state) {
                topic.publish('compulink/accepted-parts/ui/create-new-accepted-part/changed', state);
            }));

            topic.subscribe('compulink/accepted-parts/store/accepted-parts/fetched', lang.hitch(this, function () {
                this.acceptedPartsLayerToggle.set('disabled', false);
                this.acceptedPartsFilter.set('value', '');
                this.acceptedPartsFilter.set('disabled', false);
            }));

            topic.subscribe('/table/construct_object/data/changed', lang.hitch(this, function (store) {
                this.acceptedPartsLayerToggle.set('disabled', 'disabled');
                this.createAcceptedPartToggle.set('disabled', 'disabled');
            }));

            on(this.acceptedPartsFilter, 'keyup', lang.hitch(this, function (event) {
                topic.publish('compulink/accepted-parts/ui/table/filter/changed', this.acceptedPartsFilter.get('value'));
            }));

            topic.subscribe('compulink/accepted-parts/layers/first-point/undo/on', lang.hitch(this, function () {
                this.undoFirstPoint.set('disabled', false);
            }));

            topic.subscribe('compulink/accepted-parts/layers/first-point/undo/off', lang.hitch(this, function () {
                this.undoFirstPoint.set('disabled', 'disabled');
            }));
        }
    });
});