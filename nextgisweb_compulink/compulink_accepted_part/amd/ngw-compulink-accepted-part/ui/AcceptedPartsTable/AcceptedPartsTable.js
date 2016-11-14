define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/aspect',
    'dojo/dom-style',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/dom-construct',
    'dojo/query',
    'dijit/registry',
    'ngw-compulink-libs/mustache/mustache',
    'dgrid/OnDemandGrid',
    'dgrid/extensions/ColumnResizer',
    'dojo/store/Memory',
    'dgrid/Selection',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/MenuSeparator',
    'dijit/form/Select',
    'ngw-compulink-site/ConfirmDialog',
    'ngw-compulink-site/InfoDialog',
    'dojox/dtl/_base',
    'ngw-compulink-site/ConstructObjectEditor',
    'xstyle/css!./AcceptedPartsTable.css'
], function (declare, lang, on, aspect, domStyle, topic, Deferred, xhr, domConstruct, query, registry, mustache,
             OnDemandGrid, ColumnResizer, Memory, Selection, Menu, MenuItem, MenuSeparator, Select,
             ConfirmDialog, InfoDialog, dtlBase, ConstructObjectEditor) {
    return declare(null, {
        _columns: {
            act_number_date: 'Номер и дата акта',
            change_date: {
                label: "Дата изменений",
                formatter: function (ngwDate) {
                    return ngwDate.day + '/' + ngwDate.month + '/' + ngwDate.year;
                }
            },
            acceptor: 'Принял',
            subcontr_name: 'Субподрядчик',
            comment: 'Комментарий',
            cabling_fact: 'Приложенные файлы'
        },

        constructor: function (domId, acceptedPartsStore) {
            this._acceptedPartsStore = acceptedPartsStore;

            this._grid = new (declare([OnDemandGrid, ColumnResizer, Selection]))(
                {
                    store: acceptedPartsStore.getAttributesStore(),
                    columns: this._columns,
                    selectionMode: 'single',
                    loadingMessage: 'Загрузка данных...',
                    noDataMessage: 'Нет принятых участков'
                }, domId);

            //context menu
            this._menu = new Menu({
                targetNodeIds: [this._grid.domNode],
                selector: 'div.dgrid-row',
                onShow: lang.hitch(this, function (evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames(this._grid.selection)[0];
                })

            });

            this._menu.addChild(new MenuItem({
                label: 'Редактировать атрибуты',
                onClick: lang.hitch(this, function (evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames(this._grid.selection)[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_kml';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuSeparator());

            this._menu.addChild(new MenuItem({
                label: 'Удалить',
                onClick: lang.hitch(this, function (evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames(this._grid.selection)[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_geojson';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._bindEvents();
        },

        _lastGridState: null,
        _bindEvents: function () {
            on(this._acceptedPartsStore, 'fetched', lang.hitch(this, function () {
                this._grid.store = this._acceptedPartsStore.getAttributesStore();
                this._grid.refresh();
            }));

            this._grid.on('.dgrid-row:dblclick', lang.hitch(this, function (evt) {
                topic.publish('compulink/accepted-parts/zoom', this._grid.row(evt));
            }));
        },

        _changeStatusDialog: null,
        _statusesSelector: null,
        _showChangeStatusDialog: function (itemId) {
            this._changeStatusDialog = new ConfirmDialog({
                title: 'Изменение статуса объекта строительства',
                id: 'deleteAcceptedPartDialog',
                message: 'Удалить принятый участок?',
                buttonOk: 'Удалить',
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

        _set_status_url: '/compulink/resources/{{id}}/set_focl_status?status={{status}}',
        _saveSelectedStatus: function () {
            var status = this._statusesSelector.get("value"),
                setStatusUrl = mustache.render(this._set_status_url, {
                    id: this._changeStatusDialog._itemId,
                    status: status
                });

            return xhr.get(setStatusUrl, {handleAs: 'json'});
        }
    });
});