/* global console, ngwConfig */
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dojox/dtl/_Templated",
    "dijit/_WidgetsInTemplateMixin",
    "dojox/dtl",
    "dojox/dtl/Context",
    "dojo/text!./templates/DisplayHeader.html"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    dtl,
    dtlContext,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        headerData: headerData ? headerData : null,

        //_stringRepl: function (tmpl) {
        //    var template = new dtl.Template(tmpl);
        //    var context = new dtlContext(this);
        //    return template.render(context);
        //},

        //constructor: function (options) {
        //    //declare.safeMixin(this, options);
        //},
        //
        //postCreate: function () {
        //    //this.inherited(arguments);
        //},
        //
        //startup: function () {
        //    this.inherited(arguments);
        //}
    });
});
