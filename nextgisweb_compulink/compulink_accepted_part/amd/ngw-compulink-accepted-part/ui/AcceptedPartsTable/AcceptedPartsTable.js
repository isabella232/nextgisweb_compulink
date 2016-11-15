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
    '../CreateAcceptedPartDialog/CreateAcceptedPartDialog',
    'xstyle/css!./AcceptedPartsTable.css'
], function (declare, lang, on, aspect, domStyle, topic, Deferred, xhr, domConstruct, query, registry, mustache,
             OnDemandGrid, ColumnResizer, Memory, Selection, Menu, MenuItem, MenuSeparator, Select,
             ConfirmDialog, InfoDialog, CreateAcceptedPartDialog) {
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
                    var acceptedPartId = Object.getOwnPropertyNames(this._grid.selection)[0],
                        acceptedPartAttributes = this._acceptedPartsStore.getAcceptedPartAttributes(acceptedPartId),
                        acceptedPartDialog;
                    acceptedPartDialog = new CreateAcceptedPartDialog({
                        acceptedPartsStore: this._acceptedPartsStore,
                        acceptedPartAttributes: acceptedPartAttributes
                    });
                    acceptedPartDialog.show();
                })
            }));

            this._menu.addChild(new MenuSeparator());

            this._menu.addChild(new MenuItem({
                label: 'Удалить',
                onClick: lang.hitch(this, function (evt) {
                    evt.preventDefault();
                    this._deleteAcceptedPart(Object.getOwnPropertyNames(this._grid.selection)[0]);
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

        _deleteAcceptedPart: function (itemId) {
            var deleteAcceptedPartDialog = new ConfirmDialog({
                title: 'Удалить принятый участок',
                id: 'deleteAcceptedPartDialog',
                message: 'Удалить принятый участок?',
                buttonOk: 'Удалить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function () {
                    this._acceptedPartsStore.deleteAcceptedPart(itemId).then(
                        lang.hitch(this, function () {
                        }),
                        lang.hitch(this, function () {
                            new InfoDialog({
                                isDestroyedAfterHiding: true,
                                title: 'Удаление принятого участка',
                                message: 'Удалить принятый участок не удалось. Попробуйте еще раз.'
                            }).show();
                        }));
                }),
                handlerCancel: lang.hitch(this, function () {
                })
            });

            deleteAcceptedPartDialog.show();
        }
    });
});