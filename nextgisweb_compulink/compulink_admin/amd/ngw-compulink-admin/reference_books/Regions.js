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
    'ngw-compulink-admin/reference_books/EditorRelation'
], function (declare, lang, topic, on, array, _WidgetBase, _TemplatedMixin,
             Rest, OnDemandGrid, Keyboard, Selection, EditorRelation) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: '<div></div>',

        postCreate: function () {
            var regionsStore = new Rest({
                target: ngwConfig.applicationUrl + '/compulink/services/reference_books/region/',
                useRangeHeaders: true
            });

            new (declare([OnDemandGrid, Keyboard, Selection, EditorRelation]))({
                collection: regionsStore,
                columns: this.config
            }, this.domNode);
        }
    });
});
