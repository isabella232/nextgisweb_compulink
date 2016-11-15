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
        title: 'Создать принятый участок',
        message: 'Are you sure?',
        buttonOk: 'OK',
        buttonCancel: 'Закрыть',
        id: 'createAcceptedPartDialog',
        handlerOk: function () {
        },
        handlerCancel: function () {
        },
        isDestroyedAfterHiding: true,
        isClosedAfterButtonClick: true,
        acceptedPartGeometryWkt: null,

        constructor: function (kwArgs) {
            lang.mixin(this, kwArgs);

            var creating = this.acceptedPartGeometryWkt !== null;
            if (creating) {
                this.handlerOk = lang.hitch(this, this._createAcceptedPart);
            }

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
        },

        _createAcceptedPart: function () {
            var acceptedPart = {},
                $input;
            $(this.domNode).find('input[data-field]').each(function (i, input) {
                $input = $(input);
                acceptedPart[$input.data('field')] = input.value;
            });
            acceptedPart.geom = this.acceptedPartGeometryWkt;
            this.acceptedPartsStore.createAcceptedPart(acceptedPart);
        }
    });
});