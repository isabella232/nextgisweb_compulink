define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/FoclProjectWidget.html",
    // template
    "ngw/form/UploaderList"
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
        title: "Проект",
        serializePrefix: "focl_project",

        postCreate: function () {
            this.inherited(arguments);
        },

         serializeInMixin: function (data) {
             if (data.focl_project === undefined) {
                 data.focl_project = {};
             }
         }

    });
});