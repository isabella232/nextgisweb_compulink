define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'dojo/html',
    'dojo/dom-attr',
    'dojo/dom-class',
    'ngw-compulink-site/AcceptedPartsTable',
    'xstyle/css!./resource/_AcceptedPartsPanelMixin/css/fontello.css',
    'xstyle/css!./resource/_AcceptedPartsPanelMixin/_AcceptedPartsPanelMixin.css'
], function (declare, lang, query, on, topic, html, domAttr, domClass, AcceptedPartsTable) {
    return declare(null, {
        _AcceptedPartsPanelMixin: true,

        buildAcceptedPartsTable: function () {
            this.AcceptedPartsTable = new AcceptedPartsTable(this.acceptedPartsTable, this);
        }
    });
});