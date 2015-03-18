define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/ValidationTextBox",
    "dijit/form/NumberTextBox",
    "dijit/form/ComboBox",
    "dijit/form/DateTextBox",
    "dojo/store/Memory",
    "dojo/dom",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/FoclStructWidget.html",
    // template
    "ngw/form/UploaderList"
], function (
    declare,
    lang,
    array,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ValidationTextBox,
    NumberTextBox,
    ComboBox,
    DateTextBox,
    Memory,
    dom,
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