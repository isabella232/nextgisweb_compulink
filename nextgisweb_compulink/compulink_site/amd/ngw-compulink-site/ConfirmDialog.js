define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/aspect',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dojo/on',
    'dojo/text!./templates/ConfirmDialog.html'
], function (declare, query, aspect, array, lang, html, _Widget, _TemplatedMixin,
            _WidgetsInTemplateMixin, Dialog, on, template) {
    return declare([Dialog], {
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
        },

        postCreate: function () {
            this.inherited(arguments);
            this.contentNode = query('div.cd-contentNode', this.containerNode)[0];

            if (this.handlerOk) {
                on(this.content.okButton, 'click', lang.hitch(this, function () {
                    this.handlerOk.call();
                    if (!this.isClosedAfterButtonClick) return false;
                    this.hide();
                }));
            }
            if (this.handlerCancel) {
                on(this.content.cancelButton, 'click', lang.hitch(this, function () {
                    this.handlerCancel.call();
                    if (!this.isClosedAfterButtonClick) return false;
                    this.hide();
                }));
            }

            aspect.after(this, 'hide', lang.hitch(this, function () {
                if (this.isDestroyedAfterHiding) this.destroyRecursive();
            }));
        },

        disableButtons: function () {
            this.contentNode = query('div.cd-contentNode', this.containerNode)[0];
            this.content.okButton.setDisabled(true);
            this.content.cancelButton.setDisabled(true);
        },

        enableButtons: function () {
            this.content.okButton.setDisabled(false);
            this.content.cancelButton.setDisabled(false);
        },

        config: function (params) {
            lang.mixin(this, params);
            return this;
        }
    });
});