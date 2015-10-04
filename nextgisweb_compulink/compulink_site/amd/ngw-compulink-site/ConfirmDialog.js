define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'dojo/text!./templates/ConfirmDialog.html'
], function (declare, array, lang, html, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, Dialog, on, template) {
    return declare([Dialog], {
        title: 'Confirm',
        message: 'Are you sure?',
        buttonOk: 'OK',
        buttonCancel: 'Cancel',
        handlerOk: function () {},
        handlerCancel: function () {},
        isDestroyedAfterHiding: false,

        constructor: function (kwArgs) {
            lang.mixin(this, kwArgs);

            var contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: template,
                message: this.message,
                buttonOk: this.buttonOk,
                buttonCancel: this.buttonCancel
            }));

            contentWidget.startup();
            this.content = contentWidget;
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.handlerOk) {
                on(this.content.okButton, 'click', lang.hitch(this, function () {
                    this.handlerOk.call();
                    this.hide();
                    if (this.isDestroyedAfterHiding) {
                        this.destroyRecursive();
                    }
                }));
            }
            if (this.handlerCancel) {
                on(this.content.cancelButton, 'click', lang.hitch(this, function () {
                    this.handlerCancel.call();
                    this.hide();
                    if (this.isDestroyedAfterHiding) {
                        this.destroyRecursive();
                    }
                }));
            }
        },

        config: function (params) {
            lang.mixin(this, params);
            return this;
        }
    });
});