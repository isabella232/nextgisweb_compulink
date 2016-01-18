define([
    'dojo/_base/declare',
    'dojo/query',
    'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/request/xhr',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-compulink-site/ConfirmDialog',
    'dojo/on',
    'dojox/layout/TableContainer',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/ConstructObjectEditor.html'
], function (declare, query, Deferred, domConstruct, array, lang, html, xhr, _Widget,
             _TemplatedMixin, _WidgetsInTemplateMixin,
             ConfirmDialog, on, TableContainer, TextBox, NumberTextBox, mustache, template) {
    var widget = declare([ConfirmDialog], {
        title: 'Изменение объекта строительства',
        message: '',
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
                        this.updateDataStore(this._lastGridState);
                    }),
                    lang.hitch(this, function () {
                        new InfoDialog({
                            isDestroyedAfterHiding: true,
                            title: 'Изменение статуса объекта строительства',
                            message: 'Изменить статус не удалось.<br/>Попробуйте еще раз.'
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
            this.contentNode = query('div.cd-contentNode', this.containerNode)[0];

            if (this.handlerOk) {
                on(this.content.okButton, 'click', lang.hitch(this, function () {
                    this.handlerOk.call();
                    if (!this.isClosedAfterButtonClick) return false;
                    this.hide();
                }));
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
                        'labelWidth': '150'
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
                        cSetting.editorArgs['autoWidth'] = false;
                        element = new cSetting.editor(cSetting.editorArgs);
                        element.label = cSetting.label;
                    }
                    if (element) {
                        if (construct_object[cSetting.field + '_id']) {
                            element.set('value', construct_object[cSetting.field + '_id'], construct_object[cSetting.field]);
                        } else {
                            element.set('value', construct_object[cSetting.field]);
                        }
                        element.set('style', {width: '200px'});
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

        _changeStatusDialog: null,
        _statusesSelector: null,
        _showChangeStatusDialog: function (itemId) {
            this._changeStatusDialog = new ConfirmDialog({
                title: 'Изменение статуса объекта строительства',
                message: '',
                buttonOk: 'Сохранить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function () {
                    this._saveSelectedStatus().then(
                        lang.hitch(this, function () {
                            this.updateDataStore(this._lastGridState);
                        }),
                        lang.hitch(this, function () {
                            new InfoDialog({
                                isDestroyedAfterHiding: true,
                                title: 'Изменение статуса объекта строительства',
                                message: 'Изменить статус не удалось.<br/>Попробуйте еще раз.'
                            }).show();
                        }));
                    this._changeStatusDialog = null;
                    this._statusesSelector = null;
                }),
                handlerCancel: lang.hitch(this, function () {
                    this._changeStatusDialog = null;
                    this._statusesSelector = null;
                })
            });

            this._changeStatusDialog._itemId = itemId;

            var pStatus = domConstruct.create('p', {
                innerHTML: 'Загрузка статусов...',
                class: 'loading-statuses'
            });
            domConstruct.place(pStatus, this._changeStatusDialog.contentNode);

            this._changeStatusDialog.show();
        },

        _get_statuses_url: ngwConfig.applicationUrl + '/compulink/resources/{{id}}/focl_status',
        _loadStatuses: function (itemId) {
            var get_statuses_url = mustache.render(this._get_statuses_url, {id: itemId});

            xhr.get(get_statuses_url, {handleAs: 'json'})
                .then(lang.hitch(this, function (statusesInfo) {
                    this._buildStatusesSelector(statusesInfo);
                }));
        },

        _buildStatusesSelector: function (statusesInfo) {
            var availableStatuses = statusesInfo.statuses,
                countStatuses = availableStatuses.length,
                statusesOptions = [],
                statusesOptionItem,
                statusInfo, i;

            for (i = 0; i < countStatuses; i++) {
                statusInfo = availableStatuses[i];
                statusesOptionItem = {
                    label: statusInfo.name, value: statusInfo.id
                };

                if (statusInfo.id === statusesInfo.focl_status) {
                    statusesOptionItem.selected = true;
                }

                statusesOptions.push(statusesOptionItem);
            }

            this._removeLoadingStatusesMessage();

            domConstruct.place('<label for="statusesSelector">Выберите статус </label>',
                this._changeStatusDialog.contentNode);

            this._statusesSelector = new Select({
                id: "statusesSelector",
                options: statusesOptions
            });
            this._statusesSelector.placeAt(this._changeStatusDialog.contentNode).startup()
        },

        _removeLoadingStatusesMessage: function () {
            query('p.loading-statuses', this._changeStatusDialog.contentNode).forEach(domConstruct.destroy);
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

            array.forEach(this.controlsSettings, function (cSetting) {
                if (cSetting.editor) {
                    element = this._editorElements[cSetting.field];
                    value = element.get('value');
                    if (value instanceof Date) {
                        editedConstructObject[cSetting.field] = value;
                    } else if (typeof value === 'object') {
                        editedConstructObject[cSetting.field] = value.label;
                        editedConstructObject[cSetting.field + '_id'] = value.id;
                    } else {
                        editedConstructObject[cSetting.field] = value;
                    }
                }
            }, this);

            return editedConstructObject;
        }
    });

    return {
        run: function (id) {
            if (!construct_object_editor_settings) {
                throw 'ConstructObjectEditor: construct_object_editor_settings is not defined!';
            }
            var editor = new widget({
                constructObjectId: id,
                controlsSettings: construct_object_editor_settings
            });
            editor.show();
        }
    }
});