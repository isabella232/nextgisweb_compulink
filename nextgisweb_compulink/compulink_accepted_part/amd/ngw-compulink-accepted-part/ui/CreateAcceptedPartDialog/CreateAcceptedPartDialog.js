define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-compulink-site/ConfirmDialog',
    'dojo/on',
    'dojo/text!./CreateAcceptedPartDialog.html',
    'dojox/layout/TableContainer',
    'dijit/form/TextBox'
], function (declare, query, array, lang, html, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, ConfirmDialog, on,
             template) {
    return declare([ConfirmDialog], {
        title: 'Confirm',
        message: 'Are you sure?',
        buttonOk: 'OK',
        buttonCancel: 'Cancel',
        id: 'confirmDialog',
        handlerOk: function () {},
        handlerCancel: function () {},
        isDestroyedAfterHiding: false,
        isClosedAfterButtonClick: true,

        constructor: function (kwArgs) {
            lang.mixin(this, kwArgs);

            var contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: template,
                message: this.message,
                id: this.divTopAttributes,
                buttonOk: this.buttonOk,
                buttonCancel: this.buttonCancel
            }));

            contentWidget.startup();
            this.content = contentWidget;

            this.hide = this._hideDialog;
        }
    });
});