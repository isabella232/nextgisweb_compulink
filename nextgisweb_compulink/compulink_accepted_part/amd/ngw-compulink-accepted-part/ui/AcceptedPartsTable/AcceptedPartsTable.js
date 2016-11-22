define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
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
    'ngw-compulink-editor/editor/NgwServiceFacade',
    'xstyle/css!./AcceptedPartsTable.css'
], function (declare, lang, array, on, aspect, domStyle, topic, Deferred, xhr, domConstruct, query, registry, mustache,
             OnDemandGrid, ColumnResizer, Memory, Selection, Menu, MenuItem, MenuSeparator, Select,
             ConfirmDialog, InfoDialog, CreateAcceptedPartDialog, NgwServiceFacade) {
    return declare(null, {
        _ngwServiceFacade: new NgwServiceFacade(),

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
            attachment: {
                label: 'Приложенные файлы',
                formatter: function (attachments, feature) {
                    var attachmentsHtml = ['<div class="ap_row_attachment">'],
                        grid = this.grid,
                        url;
                    array.forEach(attachments, lang.hitch(this, function (attachment) {
                        url = grid._ngwServiceFacade.getAttachmentUrlForDownload(
                            grid._acceptedPartsStore._layerId,
                            feature.id,
                            attachment.id
                        );
                        attachmentsHtml.push('<a class="icon icon-doc-text" target="_blank" title="' +
                            attachment.name + '" href="' + url + '"></a>');
                    }));
                    attachmentsHtml.push('</div>');
                    return attachmentsHtml.join(' ');
                }
            }
        },

        constructor: function (domId, acceptedPartsStore) {
            this._acceptedPartsStore = acceptedPartsStore;

            this._grid = new (declare([OnDemandGrid, ColumnResizer, Selection]))(
                {
                    store: acceptedPartsStore.getAttributesStore(),
                    columns: this._columns,
                    selectionMode: 'single',
                    loadingMessage: 'Загрузка данных...',
                    noDataMessage: 'Нет принятых участков',
                    _ngwServiceFacade: this._ngwServiceFacade,
                    _acceptedPartsStore: this._acceptedPartsStore
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
                        acceptedPartId: acceptedPartId,
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

        _sourceStore: null,
        _filter: '',
        _bindEvents: function () {
            on(this._acceptedPartsStore, 'fetched', lang.hitch(this, function () {
                this._sourceStore = this._acceptedPartsStore.getAttributesStore();
                this._refreshTable();
            }));

            this._grid.on('.dgrid-row:dblclick', lang.hitch(this, function (evt) {
                topic.publish('compulink/accepted-parts/zoom', this._grid.row(evt));
            }));

            topic.subscribe('compulink/accepted-parts/ui/table/filter/changed', lang.hitch(this, function (value) {
                this._filter = value;
                this._refreshTable();
            }));

            this._grid.on('dgrid-select', lang.hitch(this, function (evt) {
                var row = evt.rows[0];
                topic.publish('compulink/accepted-parts/ui/table/selected', row.data);
            }));
        },

        _refreshTable: function () {
            this._grid.store = this._getFilteredStore();
            this._grid.refresh();
        },

        _getFilteredStore: function () {
            var filteredStore = new Memory([]);

            array.forEach(this._sourceStore.data, lang.hitch(this, function (item) {
                if (item.act_number_date.indexOf(this._filter) !== -1 ||
                    item.subcontr_name.indexOf(this._filter) !== -1) {
                    filteredStore.add(item);
                }
            }));

            return filteredStore;
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