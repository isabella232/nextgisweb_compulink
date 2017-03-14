define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/date/locale',
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
], function (declare, lang, array, locale, on, aspect, domStyle, topic, Deferred, xhr, domConstruct, query, registry, mustache,
             OnDemandGrid, ColumnResizer, Memory, Selection, Menu, MenuItem, MenuSeparator, Select,
             ConfirmDialog, InfoDialog, CreateAcceptedPartDialog, NgwServiceFacade) {
    return declare(null, {
        _ngwServiceFacade: new NgwServiceFacade(),

        _columns: {
            act_number_date: 'Номер и дата акта',
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
            },
            acceptor: 'Автор изменений',
            change_date: {
                label: "Дата изменений",
                formatter: function (ngwDate) {
                    var date_change = new Date(ngwDate.year, ngwDate.month, ngwDate.day);
                    return locale.format(date_change, {selector:"date", datePattern: 'dd.MM.yyyy' } );
                }
            }
        },

        _noDataMessage: 'Нет принятых участков',
        _welcomeToSelectResourceMessage: 'Выберите объект строительства',

        constructor: function (domId, acceptedPartsStore) {
            this._acceptedPartsStore = acceptedPartsStore;

            this._grid = new (declare([OnDemandGrid, ColumnResizer, Selection]))(
                {
                    store: acceptedPartsStore.getAttributesStore(),
                    columns: this._columns,
                    selectionMode: 'single',
                    loadingMessage: 'Загрузка данных...',
                    noDataMessage: this._welcomeToSelectResourceMessage,
                    _ngwServiceFacade: this._ngwServiceFacade,
                    _acceptedPartsStore: this._acceptedPartsStore
                }, domId);

            this._makeMenu();
            this._bindMenu();

            this._bindEvents();
        },

        _makeMenu: function () {
            this._menu = new Menu({
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
        },

        _bindMenu: function () {
            var bindingsCount = this._menu._bindings.length;
            if (bindingsCount === 1) {
                return true;
            } else if (bindingsCount > 1) {
                console.error(new Error('AcceptedPartsTable: multiple Menu bindings - ' +
                    bindingsCount +' bindings'));
            }
            this._menu.bindDomNode(this._grid.domNode);
        },

        _unbindMenu: function () {
            this._menu.unBindDomNode(this._grid.domNode);
            this._menu._bindings = [];
        },

        _sourceStore: null,
        _filter: '',
        _bindEvents: function () {
            on(this._acceptedPartsStore, 'fetched', lang.hitch(this, function () {
                this._grid.noDataMessage = this._noDataMessage;
                this._sourceStore = this._acceptedPartsStore.getAttributesStore();
                this._refreshTable();
            }));

            on(this._acceptedPartsStore, 'cleared', lang.hitch(this, function () {
                this._grid.noDataMessage = this._welcomeToSelectResourceMessage;
                this._sourceStore = this._acceptedPartsStore.getAttributesStore();
                this._refreshTable();
            }));

            this._grid.on('.dgrid-row:dblclick', lang.hitch(this, function (evt) {
                var row = this._grid.row(evt);
                topic.publish('compulink/accepted-parts/zoom', row.data, true);
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
        },

        _noRightsMessage: 'У вас нет прав для просмотра принятых участков выбранного объекта строительства',
        setNoRightsMode: function () {
            this._grid.noDataMessage = this._noRightsMessage;
            this._sourceStore = this._acceptedPartsStore.getAttributesStore();
            this._refreshTable();
        },

        setListMode: function () {
            this._unbindMenu();
        },

        setEditMode: function () {
            this._bindMenu();
        }
    });
});