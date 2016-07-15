define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/FoclStructWidget.html"
], function (
    declare,
    lang,
    array,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    template
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Объект строительства",
        serializePrefix: "focl_struct",

        postCreate: function () {
            this.inherited(arguments);
        },


         serializeInMixin: function (data) {
             if (data.focl_struct === undefined) {
                 data.focl_struct = {};
             }
         }

    });
});
