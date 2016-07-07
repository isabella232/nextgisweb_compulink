define([
    'dojo/_base/declare',
    'dojo/_base/lang',
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
    'ngw-compulink-site/ConstructObjectEditor',
    'xstyle/css!./resource/SelectedResourcesTable.css'
], function (declare, lang, aspect, domStyle, topic, Deferred, xhr, domConstruct, query, registry, mustache,
             OnDemandGrid, ColumnResizer, Memory, Selection, Menu, MenuItem, MenuSeparator, Select,
             ConfirmDialog, InfoDialog, ConstructObjectEditor) {
    return declare(null, {

        _columns: {
                display_name: 'Наименование',
                region: 'Субъект РФ',
                district: 'Муниципальный район',
                status: 'Статус',
                cabling_plan: 'Плановая протяженность (км)',
                cabling_fact: 'Проложено кабеля (км)',
                cabling_percent: '% выполнения',
                start_build_time: 'Начало СМР',
                end_build_time: 'Окончание СМР',
                start_deliver_time: 'Начало сдачи заказчику',
                end_deliver_time: 'Окончание сдачи заказчику',
                subcontr: 'Субподрядчик'
        },

        _get_focl_info_url: ngwConfig.applicationUrl + '/compulink/resources/focl_info',
        _get_extent_url: ngwConfig.applicationUrl + '/compulink/resources/focl_extent',


        constructor: function (domId, Display) {
            this._Display = Display;
            this._store = Memory({data: []});

            //grid
            this._grid = new (declare([OnDemandGrid, ColumnResizer, Selection]))(
                {
                    store: this._store,
                    columns: this._columns,
                    selectionMode: 'single',
                    loadingMessage: 'Загрузка данных...',
                    noDataMessage: 'Нет выбранных элементов'
                }, domId);

            //context menu
            this._menu = new Menu({
                targetNodeIds: [this._grid.domNode],
                selector: 'div.dgrid-row',
                onShow: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                })

            });

            this._menu.addChild(new MenuItem({
                label: 'Экспорт координат в KML',
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_kml';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuItem({
                label: 'Экспорт координат в GeoJSON',
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_geojson';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuItem({
                label: 'Экспорт координат в CSV',
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_csv';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuSeparator());

            this._menu.addChild(new MenuItem({
                label: 'Изменить статус',
                onClick: lang.hitch(this, function (evt) {
                    var itemId = Object.getOwnPropertyNames( this._grid.selection )[0];
                    this._showChangeStatusDialog(itemId);
                    this._loadStatuses(itemId);
                })
            }));

            this._menu.addChild(new MenuItem({
                label: 'Открыть карточку объекта',
                onClick: lang.hitch(this, function (evt) {
                    var itemId = Object.getOwnPropertyNames(this._grid.selection)[0],
                        item = this._grid.store.query({id: itemId});
                    if (item) {
                        ConstructObjectEditor.run(itemId, item[0].editable, lang.hitch(this, function () {
                            this.updateDataStore(this._lastGridState);
                            topic.publish('resources/tree/refresh');
                        }));
                    }
                })
            }));

            this._menu.addChild(new MenuSeparator());
            this._menu.addChild(new MenuItem({
                label: 'Редактировать геометрию объекта',
                onClick: lang.hitch(this, function (evt) {
                    // TODO: need check!
                    var extent = this._Display.map.olMap.getExtent().transform('EPSG:3857', 'EPSG:4326'),
                        extentArray = [
                            extent.left,extent.bottom,
                            extent.right, extent.top
                        ];

                    window.open(displayConfig.editorUrl +
                        '?resource_id=' + Object.getOwnPropertyNames(this._grid.selection )[0] +
                        '&extent=' + JSON.stringify(extentArray), '_blank');
                })
            }));

            this._menu.addChild(new MenuItem({
                label: 'Проиграть ход строительства',
                onClick: lang.hitch(this, function (evt) {
                    window.open(displayConfig.playerUrl +
                        '?resource_id=' + Object.getOwnPropertyNames(this._grid.selection )[0]);
                })
            }));

            // Меняем цвет строки для просроченных объектов, выделяем суммарные значения
            aspect.after(this._grid, 'renderRow', function(row, args) {

                if (args[0]['cabling_plan_today'] &&
                    args[0]['cabling_plan_today']!=0 &&
                    !args[0]['is_overdue'] &&
                    (args[0]['status_row'] == 'project' || args[0]['status_row'] == 'in_progress')
                ) {

                    var cabling_plan_today = args[0]['cabling_plan_today'];
                    var cabling_fact = args[0]['cabling_fact'];

                    var plan_overhead = (cabling_fact - cabling_plan_today)/cabling_plan_today;

                    if (plan_overhead < -0.15 ) {
                        domStyle.set(row, 'background-color', '#FFE7E5');
                    }
                }

                if (args[0]['is_overdue']) {
                    domStyle.set(row, 'color', '#ff6666');
                }
                if (args[0]['is_month_overdue']) {
                    domStyle.set(row, 'font-weight', 'bold');
                }
                if (args[0]['is_focl_delivered']) {
                    domStyle.set(row, 'color', '#008600');
                }
                return row;
            });

            //this._grid.startup();

            this.bindEvents();
        },

        _lastGridState: null,
        bindEvents: function () {
            topic.subscribe('resources/changed', lang.hitch(this, function (selection) {
                this._lastGridState = selection;
                this.updateDataStore(selection);
            }));

            this._grid.on('.dgrid-row:dblclick', lang.hitch(this, function (evt) {
                this.zoomToResource(evt);
            }));

        },

        zoomToResource: function(evt) {
            var row = this._grid.row(evt); //row.id == id of group resource

            xhr.post(this._get_extent_url, {handleAs: 'json', data: {id: row.id}}).then(lang.hitch(this, function (data) {
                if (data && data.extent) {
                    topic.publish('map/zoom_to', data.extent);
                }
            }));
        },

        updateDataStore: function(ids) {
            ids_num = [];
            for (var i=0; i<ids.length; i++) { ids_num.push(ids[i].replace('res_','')); }

            xhr.post(this._get_focl_info_url, {handleAs: 'json', data: {ids: ids_num}}).then(lang.hitch(this, function (data) {
                this._store = Memory([]);
                this._store.data = data;
                this._grid.store = this._store;
                this._grid.refresh();
            }));
        },

        _changeStatusDialog: null,
        _statusesSelector: null,
        _showChangeStatusDialog: function (itemId) {
            this._changeStatusDialog = new ConfirmDialog({
                title: 'Изменение статуса объекта строительства',
                id: 'changeStatusDialog',
                message: '',
                buttonOk: 'Сохранить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function() {
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
            var get_statuses_url = mustache.render(this._get_statuses_url, { id: itemId });

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