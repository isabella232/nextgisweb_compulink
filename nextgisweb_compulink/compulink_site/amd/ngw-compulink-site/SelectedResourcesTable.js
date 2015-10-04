define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/dom-style',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/dom-construct',
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
    'xstyle/css!./resource/SelectedResourcesTable.css'
], function (declare, lang, aspect, domStyle, topic, Deferred, xhr, domConstruct, registry, mustache, OnDemandGrid,
             ColumnResizer, Memory, Selection, Menu, MenuItem, MenuSeparator, Select, ConfirmDialog) {
    return declare(null, {

        _columns: {
                display_name: 'Наименование',
                status: 'Статус',
                region: 'Субъект РФ',
                district: 'Муниципальный район',
                cabling_fact: 'Протяженность ВОЛС',
                start_build_time: 'Строительство ВОЛС (начало)',
                end_build_time: 'Строительство ВОЛС (окончание)',
                start_deliver_time: 'Сдача ВОЛС в эксплуатацию (начало)',
                end_deliver_time: 'Сдача ВОЛС в эксплуатацию (окончание)',
                subcontr: 'Субподрядчик СМР ВОЛС'
        },

        _get_focl_info_url: ngwConfig.applicationUrl + '/compulink/resources/focl_info',
        _get_extent_url: ngwConfig.applicationUrl + '/compulink/resources/focl_extent',


        constructor: function (domId) {
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
                selector: 'div.dgrid-row'

            });

            this._menu.addChild(new MenuItem({
                label: 'Экспорт в KML',
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_kml';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuItem({
                label: 'Экспорт в GeoJSON',
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + '/compulink/resources/' + item + '/export_geojson';
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuItem({
                label: 'Экспорт в CSV',
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
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    this._showChangeStatusDialog(item);
                    this._loadStatuses(item);
                })
            }));

            // Меняем цвет строки для просроченных объектов, выделяем суммарные значения
            aspect.after(this._grid, 'renderRow', function(row, args) {
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

        bindEvents: function () {
            topic.subscribe('resources/changed', lang.hitch(this, function (selection) {
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
                this._store.data = data;
                this._grid.refresh();
            }));
        },

        _changeStatusDialog: null,
        _showChangeStatusDialog: function (gridItem) {
            this._changeStatusDialog = new ConfirmDialog({
                title: 'Изменение статуса объекта строительства',
                message: '',
                buttonOk: 'Сохранить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function() {
                    this._changeStatusDialog = null;
                }),
                handlerCancel: lang.hitch(this, function () {
                    this._changeStatusDialog = null;
                })
            });

            var pStatus = domConstruct.create('p', {
                innerHTML: 'Загрузка статусов...',
                class: 'loading-statuses'
            });
            domConstruct.place(pStatus, this._changeStatusDialog.contentNode);

            this._changeStatusDialog.show();
        },

        _get_statuses_url: ngwConfig.applicationUrl + '/compulink/resources/{id}/focl_status',
        _loadStatuses: function (gridItem) {
            var get_statuses_url = this._get_statuses_url.replace('{id}', gridItem);

            xhr.get(get_statuses_url, {handleAs: 'json'})
                .then(lang.hitch(this, function (statusesInfo) {
                    this._buildStatusesSelector(statusesInfo);
            }));
        },

        _buildStatusesSelector: function (statusesInfo) {
            var availableStatuses = statusesInfo.statuses,
                countStatuses = availableStatuses.length,
                statusesOptions = [],
                statusInfo, i;

            for (i = 0; i < countStatuses; i++) {
                statusInfo = availableStatuses[i];
                statusesOptions.push({label: statusInfo.name, value: statusInfo.id});
            }

            new Select({
                name: "select2",
                options: statusesOptions
            }).placeAt(this._changeStatusDialog.contentNode).startup();
        }
    });
});