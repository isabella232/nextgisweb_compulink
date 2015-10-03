/* global console, ngwConfig */
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dojox/dtl/_Templated",
    "dijit/_WidgetsInTemplateMixin",
    "dojox/dtl",
    "dojox/dtl/Context",
    "dojo/text!./templates/DisplayHeader.html",
    "xstyle/css!./templates/css/DisplayHeader.css"
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
        headerData: window.headerData ? window.headerData : null
    });
});
