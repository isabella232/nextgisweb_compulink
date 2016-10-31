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
    'ngw-compulink-accepted-part/AcceptedPartsTable/AcceptedPartsTable',
    'dojo/text!./AcceptedPartsPanel.html',
    'xstyle/css!./css/fontello/css/fontello.css',
    'xstyle/css!./css/AcceptedPartsPanel.css'
], function (declare, lang, query, on, topic, html, domAttr, domClass,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             AcceptedPartsTable, template) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        postCreate: function () {
            this._buildAcceptedPartsTable();
            this._bindAcceptedPartsPanelEvents();
        },

        _buildAcceptedPartsTable: function () {
            this.AcceptedPartsTable = new AcceptedPartsTable(this.acceptedPartsTable, this);
        },

        _bindAcceptedPartsPanelEvents: function () {
            on(this.acceptedPartsLayerToggle, 'change', lang.hitch(this, function (state) {
                if (state) {
                    this.acceptedPartsLayerToggle.set('iconClass', 'icon icon-eye');
                } else {
                    this.acceptedPartsLayerToggle.set('iconClass', 'icon icon-eye-off');
                }
            }));
        }
    });
});