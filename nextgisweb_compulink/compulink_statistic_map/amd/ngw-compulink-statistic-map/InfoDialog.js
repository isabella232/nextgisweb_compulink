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
    'dojo/text!./templates/InfoDialog.html'
], function (declare, query, aspect, array, lang, html, _Widget,
             _TemplatedMixin, _WidgetsInTemplateMixin, Dialog, on, template) {
    return declare([Dialog], {
        title: 'Info',
        message: 'Info',
        buttonOk: 'OK',
        handlerOk: function () {},
        isDestroyedAfterHiding: false,
        isClosedAfterButtonClick: true,

        constructor: function (kwArgs) {
            lang.mixin(this, kwArgs);

            var contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: template,
                message: this.message,
                buttonOk: this.buttonOk
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

            aspect.after(this, 'hide', lang.hitch(this, function () {
                if (this.isDestroyedAfterHiding) this.destroyRecursive();
            }));
        },

        disableButtons: function () {
            this.content.okButton.setDisabled(true);
        },

        enableButtons: function () {
            this.content.okButton.setDisabled(false);
        },

        config: function (params) {
            lang.mixin(this, params);
            return this;
        }
    });
});