require([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/Deferred",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/aspect",

    "dijit/registry",
    "dijit/_Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Dialog",

    "dojo/text!ngw-compulink-site/dialogs/templates/ConfirmDialog.html",

    "dijit/form/Button",
    "dojo/domReady!"
], function (ready,
             declare,
             lang,
             Deferred,
             array,
             dom,
             aspect,
             registry,
             _Widget,
             _TemplatedMixin,
             _WidgetsInTemplateMixin,
             Dialog,
             template) {

    return declare([Dialog], {

        title: "Confirm",
        message: "Are you sure?",

        constructor: function (/*Object*/ kwArgs) {
            lang.mixin(this, kwArgs);

            var message = this.message;

            var contentWidget = new (declare(
                [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin],
                {
                    templateString: template,
                    message: message
                }
            ));
            contentWidget.startup();
            this.content = contentWidget;
        },

        postCreate: function () {
            this.inherited(arguments);
            this.connect(this.content.cancelButton, "onClick", "onCancel");
        },

        onExecute: function () {
            console.log("OK");
        },

        onCancel: function () {
            console.log("Cancel");
        }

    });
});