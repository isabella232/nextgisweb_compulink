define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/on',
    'dojo/_base/array',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'ngw-compulink-libs/dgrid-0.4.0/dstore/Rest',
    'ngw-compulink-libs/dgrid-0.4.0/dgrid/OnDemandGrid',
    'ngw-compulink-libs/dgrid-0.4.0/dgrid/Keyboard',
    'ngw-compulink-libs/dgrid-0.4.0/dgrid/Selection',
    'ngw-compulink-libs/dgrid-0.4.0/dgrid/Editor'
], function (declare, lang, topic, on, array, _WidgetBase, _TemplatedMixin,
             Rest, OnDemandGrid, Keyboard, Selection, Editor) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: '<div></div>',

        postCreate: function () {
            var districtsStore = new Rest({
                target: ngwConfig.applicationUrl + '/compulink/services/reference_books/district/',
                useRangeHeaders: true
            });

            var grid = new (declare([OnDemandGrid, Keyboard, Selection, Editor]))({
                collection: districtsStore,
                columns: this.config
            }, this.domNode);
        }
    });
});