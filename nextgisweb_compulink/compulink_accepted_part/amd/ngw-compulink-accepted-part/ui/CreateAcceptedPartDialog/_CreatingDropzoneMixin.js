define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/Deferred',
    'dojo/promise/all',
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
], function (declare, query, array, lang, html, Deferred, all, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
             ConfirmDialog, NgwServiceFacade, InfoDialog, on, template, dropzone) {
    return declare([], {
        _initCreatingDropzone: function () {
            this._dropzone = new Dropzone('#ap_files', {
                url: ngwConfig.applicationUrl + '/compulink/empty',
                dictDefaultMessage: 'Кликните для загрузки',
                uploadMultiple: false
            });

            this._dropzone.on('addedfile', lang.hitch(this, this._creatingDropzoneAddedFileHandler));
        },

        _creatingDropzoneAddedFileHandler: function (file) {
            var previewElement = file.previewElement,
                $fileName = $(previewElement).find('div.dz-filename'),
                removeElement;

            removeElement = $fileName.append('<a class="remove-file icon icon-cancel-circled2" href="javascript:void(0);"></a>');

            removeElement.find('a.remove-file').click(lang.hitch(this, function () {
                this._dropzone.removeFile(file);
            }));
        },

        _uploadFiles: function (files) {
            var deferreds = [],
                deferred = new Deferred();

            this._dropzone.options.url = ngwConfig.applicationUrl + '/api/component/file_upload/upload';

            this._dropzone.on('success', lang.hitch(this, function (file) {
                file.deferred.resolve(file);
            }));

            this._dropzone.on('error', lang.hitch(this, function (file) {
                file.deferred.resolve(file);
            }));

            array.forEach(files, lang.hitch(this, function (file) {
                this._uploadFile(file);
                deferreds.push(file.deferred);
            }));

            all(deferreds).then(lang.hitch(this, function (files) {
                this._afterFilesUploaded(files).then(function () { deferred.resolve() });
            }));

            return deferred.promise;
        },

        _uploadFile: function (file) {
            var deferred = new Deferred();

            file.deferred = deferred;
            this._dropzone.uploadFile(file);

            return deferred.promise;
        },

        _afterFilesUploaded: function (files) {
            var deferreds = [],
                deferred = new Deferred();

            array.forEach(files, lang.hitch(this, function (file) {
                deferreds.push(this._attachFileToAcceptedPart(file));
            }));

            all(deferreds).then(function () { deferred.resolve(); });

            return deferred.promise;
        },

        _attachFileToAcceptedPart: function (file) {
            var upload_meta,
                attachmentInfo,
                deferred = new Deferred();

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

            this._ngwServiceFacade.applyAttachmentToFeature(
                this.acceptedPartsStore._layerId,
                this.acceptedPartId,
                attachmentInfo
            ).then(
                function () { deferred.resolve(); },
                function () { deferred.resolve(); }
            );

            return deferred.promise;
        }
    });
});