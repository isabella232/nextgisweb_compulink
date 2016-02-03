define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/dom-style',
    'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/request/xhr',
    'dojo/date/locale',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-compulink-site/ConfirmDialog',
    'ngw-compulink-site/InfoDialog',
    'dojo/on',
    'dojox/layout/TableContainer',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/ConstructObjectEditor.html',
    'xstyle/css!./templates/css/ConstructObjectEditor.css'
], function (declare, query, domStyle, Deferred, domConstruct, array, lang, html, xhr, locale, _Widget,
             _TemplatedMixin, _WidgetsInTemplateMixin, ConfirmDialog, InfoDialog, on, TableContainer,
             TextBox, NumberTextBox, mustache, template) {
    var widget = declare([ConfirmDialog], {
        title: 'Изменение объекта строительства',
        message: '',
        id: 'constructObjectEditor',
        buttonOk: 'Сохранить',
        buttonCancel: 'Отменить',
        isDestroyedAfterHiding: true,
        isClosedAfterButtonClick: true,
        constructObjectId: null,
        controlsSettings: null,

        constructor: function (settings) {
            this.inherited(arguments);

            lang.mixin(this, settings);

            this.handlerOk = lang.hitch(this, function () {
                this._saveChanges().then(
                    lang.hitch(this, function () {
                        if (this.afterSave) {
                            this.afterSave.call();
                        }
                    }),
                    lang.hitch(this, function () {
                        new InfoDialog({
                            isDestroyedAfterHiding: true,
                            title: 'Ошибка при сохранении',
                            message: 'Изменить объект строительства не удалось.<br/>Попробуйте еще раз.'
                        }).show();
                    }));
                this._changeStatusDialog = null;
                this._statusesSelector = null;
            });

            this.handlerCancel = lang.hitch(this, function () {
                this._changeStatusDialog = null;
                this._statusesSelector = null;
            });
        },

        postCreate: function () {
            this.inherited(arguments);

            if (!this.editable) {
                array.forEach(query('#constructObjectEditor span.dijitButton'), function (button) {
                    domStyle.set(button, 'display', 'none');
                });
            }

            var pStatus = domConstruct.create('p', {
                innerHTML: 'Загрузка атрибутов...',
                class: 'loading-statuses'
            });
            domConstruct.place(pStatus, this.contentNode);

            this._loadObject().then(lang.hitch(this, function (construct_object) {
                this._buildControls(construct_object);
            }));
        },

        _loadObject: function () {
            var url = ngwConfig.applicationUrl + '/compulink/services/reference_books/construct_object/'
                    + this.constructObjectId,
                deferred = new Deferred();
            xhr(url, {
                handleAs: 'json'
            }).then(lang.hitch(this, function (construct_object) {
                deferred.resolve(construct_object);
            }));
            return deferred.promise;
        },

        _editorElements: {},
        _buildControls: function (construct_object) {
            var element,
                elementArgs,
                tableContainer = new TableContainer(
                    {
                        cols: 1,
                        customClass: 'labelsAndValues',
                        labelWidth: '150'
                    });

            array.forEach(this.controlsSettings, function (cSetting) {
                if (cSetting.editor) {
                    if (cSetting.editor === 'text') {
                        element = new TextBox({
                            label: cSetting.label
                        });
                    } else if (cSetting.editor === 'number') {
                        element = new NumberTextBox({
                            label: cSetting.label
                        });
                    } else if (typeof cSetting.editor == 'function') {
                        element = new cSetting.editor(cSetting.editorArgs);
                        element.label = cSetting.label;
                    }
                    if (element) {
                        if (construct_object[cSetting.field + '_id']) {
                            element.set('value', construct_object[cSetting.field + '_id'],
                                construct_object[cSetting.field]);
                        } else {
                            if (construct_object[cSetting.field]) {
                                element.set('value', construct_object[cSetting.field],
                                    construct_object);
                            } else {
                                element.set('value', null);
                            }
                        }
                        element.set('style', {width: '200px'});
                        if (!this.editable) { element.set('disabled', true); }
                        tableContainer.addChild(element);
                        this._editorElements[cSetting.field] = element;
                        element = null;
                    }
                }
            }, this);

            query('p.loading-statuses', this.contentNode).forEach(domConstruct.destroy);

            tableContainer.placeAt(this.contentNode);
            tableContainer.startup();
            this._tableContainer = tableContainer;

            this.resize();
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
        },

        _hideDialog: function () {
            if (this.isDestroyedAfterHiding) this.destroyRecursive();
        },

        _saveChangesUrl: 'compulink/services/reference_books/construct_object/{{id}}',
        _saveChanges: function () {
            var editedConstructObject = this.getValue(),
                saveChangesUrl = ngwConfig.applicationUrl + '/compulink/services/reference_books/construct_object/'
                    + this.constructObjectId;

            return xhr(saveChangesUrl, {
                handleAs: 'json',
                method: 'PUT',
                data: JSON.stringify(editedConstructObject)
            });
        },

        getValue: function () {
            var value,
                element,
                editedConstructObject = {};

            array.forEach(this.controlsSettings, lang.hitch(this, function (cSetting) {
                if (cSetting.editor) {
                    element = this._editorElements[cSetting.field];
                    value = element.get('value');
                    if (value instanceof Date) {
                        editedConstructObject[cSetting.field] = locale.format(value, {datePattern: "yyyy-MM-dd", selector: "date"});
                    } else if (typeof value === 'object') {
                        if (!value) {
                            editedConstructObject[cSetting.field] = null;
                            editedConstructObject[cSetting.field + '_id'] = null;
                        } else if (value.full) {
                            lang.mixin(editedConstructObject, value);
                        } else {
                            editedConstructObject[cSetting.field] = value.label;
                            editedConstructObject[cSetting.field + '_id'] = value.id;
                        }

                    } else {
                        editedConstructObject[cSetting.field] = value;
                    }
                }
            }));

            return editedConstructObject;
        }
    });

    return {
        run: function (id, editable, afterSave) {
            if (!construct_object_editor_settings) {
                throw 'ConstructObjectEditor: construct_object_editor_settings is not defined!';
            }
            var editor = new widget({
                constructObjectId: id,
                editable: editable,
                controlsSettings: construct_object_editor_settings,
                afterSave: afterSave
            });
            editor.show();
        }
    }
});