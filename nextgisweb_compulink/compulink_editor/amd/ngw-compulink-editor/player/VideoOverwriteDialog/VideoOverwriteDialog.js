define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'dojo/text!./VideoOverwriteDialog.html',
    'ngw-compulink-site/ConfirmDialog'
], function (declare, query, array, lang, html, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, Dialog, on,
             template, ConfirmDialog) {
    return declare([ConfirmDialog], {
        constructor: function (kwArgs) {
            lang.mixin(this, kwArgs);

            var contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: template,
                message: this.message,
                id: this.divTopAttributes,
                buttonOk: this.buttonOk,
                buttonCancel: this.buttonCancel,
                url: this.url
            }));

            contentWidget.startup();
            this.content = contentWidget;

            this.hide = this._hideDialog;
        }
    });
});