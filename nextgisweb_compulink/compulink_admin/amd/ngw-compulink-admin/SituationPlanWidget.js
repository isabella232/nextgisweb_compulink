define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/SituationPlanWidget.html"
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
        title: "Ситуационный план",
        serializePrefix: "situation_plan",

        postCreate: function () {
            this.inherited(arguments);
        },

         serializeInMixin: function (data) {
             if (data.situation_plan === undefined) {
                 data.situation_plan = {};
             }
         }

    });
});
