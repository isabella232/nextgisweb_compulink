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
        _attachmentsChanged: false,

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
                this.handlerCancel = lang.hitch(this, this._cancelDialogHandler);
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
            this._dropzone.on('addedfile', lang.hitch(this, this._addedFileHandler));

            this._fillExistingFiles(this.acceptedPartAttributes);
        },

        _uploadSuccessHandler: function (file) {
            var upload_meta,
                attachmentInfo,
                applyAttachmentToFeature;

            upload_meta = JSON.parse(file.xhr.responseText).upload_meta[0];
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

            applyAttachmentToFeature.then(lang.hitch(this, function (result) {
                    file.id = result.id;
                    this._attachmentsChanged = true;
                }),
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

        _addedFileHandler: function (file) {
            var previewElement = file.previewElement,
                $fileName = $(previewElement).find('div.dz-filename'),
                removeElement;

            removeElement = $fileName.append('<a class="remove-file icon icon-cancel-circled2" href="javascript:void(0);"></a>');

            removeElement.find('a.remove-file').click(lang.hitch(this, function () {
                this._deleteAttachment(file);
            }));
        },

        _deleteAttachment: function (file) {
            var deleteAttachmentXhr,
                deleteFile,
                deleteConfirmDialog;

            deleteFile = lang.hitch(this, function () {
                deleteAttachmentXhr = this._ngwServiceFacade.deleteAttachment(this.acceptedPartsStore._layerId, this.acceptedPartId, file.id);
                deleteAttachmentXhr.then(lang.hitch(this, function () {
                    this._dropzone.removeFile(file);
                    this._attachmentsChanged = true;
                }), lang.hitch(this, function () {
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Удаление файла',
                        message: 'Удалить файл не удалось. Попробуйте еще раз.'
                    }).show();
                }));
            });

            deleteConfirmDialog = new ConfirmDialog({
                title: "Удаление файла",
                id: "deleteConfirmDialog",
                message: "Удалить файл?",
                buttonOk: "Да",
                buttonCancel: "Отменить",
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, deleteFile)
            });
            deleteConfirmDialog.show();

        },

        _fillExistingFiles: function (acceptedPartAttributes) {
            var file;
            array.forEach(acceptedPartAttributes.attachment, lang.hitch(this, function (attachment) {
                file = {
                    name: attachment.name,
                    size: attachment.size,
                    id: attachment.id
                };
                this._dropzone.emit("addedfile", file);
            }));
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
        },

        _cancelDialogHandler: function () {
            if (this._attachmentsChanged) {
                this.acceptedPartsStore.fetch();
            }
        }
    });
});