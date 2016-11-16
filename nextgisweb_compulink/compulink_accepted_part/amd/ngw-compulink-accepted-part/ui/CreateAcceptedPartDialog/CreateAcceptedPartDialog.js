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
        acceptedPartAttributes: null,
        acceptedPartId: null,
        _mode: null,

        constructor: function (kwArgs) {
            lang.mixin(this, kwArgs);

            var creating = this.acceptedPartGeometryWkt !== null,
                editing = this.acceptedPartAttributes !== null,
                contentWidget;

            if (creating) {
                this.handlerOk = lang.hitch(this, this._createAcceptedPart);
                this._mode = 'create';
            }

            if (editing) {
                this.handlerOk = lang.hitch(this, this._editAcceptedPart);
                this._mode = 'edit';
            }

            contentWidget = new (declare([_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
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

        postCreate: function () {
            this.inherited(arguments);

            if (this._mode === 'edit') {
                this._fillAcceptedPartInputs(this.acceptedPartAttributes)
            }
        },

        _fillAcceptedPartInputs: function (acceptedPartAttributes) {
            var $input,
                field;

            $(this.domNode).find('input[data-field]').each(function (i, input) {
                $input = $(input);
                field = $input.data('field');
                $input.val(acceptedPartAttributes[field]);
            });
        },

        _createAcceptedPart: function () {
            var acceptedPart = {};
            this._fillAcceptedPartAttributes(acceptedPart);
            acceptedPart.geom = this.acceptedPartGeometryWkt;
            this.acceptedPartsStore.createAcceptedPart(acceptedPart);
        },

        _fillAcceptedPartAttributes: function (acceptedPart) {
            var $input;

            $(this.domNode).find('input[data-field]').each(function (i, input) {
                $input = $(input);
                acceptedPart[$input.data('field')] = input.value;
            });

            return acceptedPart;
        },

        _editAcceptedPart: function () {
            var acceptedPart = {};
            this._fillAcceptedPartAttributes(acceptedPart);
            acceptedPart.id = this.acceptedPartId;
            this.acceptedPartsStore.modifyAcceptedPart(acceptedPart);
        }
    });
});