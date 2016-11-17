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
    'ngw-compulink-editor/editor/NgwServiceFacade',
    'ngw-compulink-site/InfoDialog',
    'dojo/on',
    'dojo/text!./CreateAcceptedPartDialog.html',
    'ngw-compulink-libs/dropzone/dropzone.min',
    'xstyle/css!./CreateAcceptedPartDialog.css',
    // 'xstyle/css!ngw-compulink-libs/dropzone/basic.css',
    // 'xstyle/css!ngw-compulink-libs/dropzone/dropzone.min.css',
    'dojox/layout/TableContainer',
    'dijit/form/TextBox',
    'dijit/form/Form'
], function (declare, query, array, lang, html, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
             ConfirmDialog, NgwServiceFacade, InfoDialog, on, template, dropzone) {
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
        _ngwServiceFacade: new NgwServiceFacade(),

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
                this._fillAcceptedPartInputs(this.acceptedPartAttributes);
                this._initDropzone();
            } else {
                $('#ap_files').parents('tr').css('display', 'none');
            }
        },

        _dropzone: null,
        _initDropzone: function () {
            this._dropzone = new Dropzone('#ap_files', {
                url: ngwConfig.applicationUrl + '/api/component/file_upload/upload',
                dictDefaultMessage: 'Кликните для загрузки',
                uploadMultiple: false
            });

            this._dropzone.on('success', lang.hitch(this, this._uploadSuccessHandler));
            this._dropzone.on('error', lang.hitch(this, this._uploadErrorHandler));
        },

        _uploadSuccessHandler: function (fileResponse) {
            var upload_meta,
                attachmentInfo,
                applyAttachmentToFeature;

            upload_meta = JSON.parse(fileResponse.xhr.responseText).upload_meta[0];
            attachmentInfo = {
                file_upload: {
                    id: upload_meta.id,
                    size: upload_meta.size
                },
                mime_type: upload_meta.mime_type,
                name: upload_meta.name,
                size: upload_meta.size
            };

            applyAttachmentToFeature = this._ngwServiceFacade.applyAttachmentToFeature(
                this.acceptedPartsStore._layerId,
                this.acceptedPartId,
                attachmentInfo
            );

            applyAttachmentToFeature.then(lang.hitch(this, function (result) {}),
                lang.hitch(this, this._uploadErrorHandler));
        },

        _uploadErrorHandler: function () {
            var files = this._dropzone.files,
                countsFiles = files.length;

            this._dropzone.removeFile(files[countsFiles - 1]);

            new InfoDialog({
                isDestroyedAfterHiding: true,
                title: 'Сохранение файла',
                message: 'Сохранить файл не удалось. Попробуйте еще раз.'
            }).show();
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