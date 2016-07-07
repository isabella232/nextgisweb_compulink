define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/request/xhr',
    'dojo/dom-style',
    'dojo/_base/array',
    'dojo/io-query',
    'dojo/store/Memory',
    'dojo/store/Observable',
    'dojo/date/locale',
    'dojo/date/stamp',
    'dojo/number',
    'dojo/json',
    'dijit/layout/BorderContainer',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./templates/DeviationGrid.html',
    'ngw/route',
    //grid
    'dgrid/Grid',
    'dgrid/Selection',
    'dgrid/ColumnSet',
    'dgrid/extensions/DijitRegistry',
    'dgrid/extensions/CompoundColumns',
    'dgrid/extensions/ColumnResizer',
    'ngw-compulink-site/ConfirmDialog',
    //style
    'ngw/dgrid/css',
    'xstyle/css!./resources/DeviationGrid.css',
    //template
    'dijit/form/CheckBox',
    'dijit/form/Button',
    'dijit/layout/ContentPane',
    'dojox/layout/TableContainer',
    'ngw-compulink-reporting/RegionSelect',
    'ngw-compulink-reporting/DistrictSelect',
    'ngw-compulink-reporting/StatusSelect',
    'ngw-compulink-site/DisplayHeader',
    'dijit/Toolbar'
], function (declare,
             lang,
             aspect,
             xhr,
             domStyle,
             array,
             ioQuery,
             Memory,
             Observable,
             locale,
             stamp,
             number,
             json,
             BorderContainer,
             _TemplatedMixin,
             _WidgetsInTemplateMixin,
             template,
             route,
             Grid,
             Selector,
             ColumnSet,
             DijitRegistry,
             CompoundColumns,
             ColumnResizer,
             ConfirmDialog) {
    // Базовый класс ggrid над которым затем делается обертка в dijit виджет
    var GridClass = declare([Grid, Selector, DijitRegistry, CompoundColumns, ColumnResizer], {});

    return declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        gutters: true,
        templateString: template,

        constructor: function (params) {
            declare.safeMixin(this, params);
            this.initializeGrid();
        },

        postCreate: function () {
            this.inherited(arguments);

            // Обрабатываем нажатие кнопки 'Выгрузить в Excel'
            //this.exportExcel.on('click', function() {
            //    var url = route.compulink.reporting.export_status_report();
            //        queryStr = ioQuery.objectToQuery(w.get('value'));
            //    window.open(url + '?' + queryStr, '_blank');
            //});

            this.showApproved.on('change', lang.hitch(this, function (checked) {
                this._offSelectHandling();
                this._clearSelection();
                if (checked) {
                    this.setDeviationGridColumns(['Default', 'Approved']);
                } else {
                    this.setDeviationGridColumns(['Default']);
                }
                this.buildDeviationGrid();
                this._onSelectHandling();
            }));

            this.buildingObjectsSelect.on('change', lang.hitch(this, function () {
                this._clearSelection();
                this.buildDeviationGrid();
            }));

            this.buildDeviationGrid();
        },

        buildDeviationGrid: function () {
            xhr(route.compulink.deviation.get_deviation_data(), {
                method: 'GET',
                handleAs: 'json',
                query: this.get('value')
            }).then(lang.hitch(this, function (data) {
                this._grid.refresh();
                this._grid.renderArray(data);
            }));
        },

        getColumnsDefault: function () {
            return [
                {label: 'Объект строительства', field: 'focl_name', name: 'focl_name', sortable: false, renderCell: this._makeMapLink},
                {label: 'Проект', field: 'focl_proj', name: 'focl_proj', sortable: false},
                {label: 'Тип объекта', field: 'object_type_name', name: 'object_type_name', sortable: false},
                {label: 'Отклонение в метрах', field: 'deviation_distance', name: 'deviation_distance', sortable: false}
            ];
        },

        _makeMapLink: function(object, value, node, options) {
            var url = ngwConfig.compulinkMapUrl +
                    '?resource_id=' + object['focl_res_id'] +
                    '&object_type=' + object['object_type'] +
                    '&object_num=' + object['object_num'] +
                    '&layers=design_layers';
            var htmlLink = '<a target="_blank" href="' + url + '">' + object['focl_name'] + '</a>';
            return node.innerHTML = htmlLink;
        },

        getColumnsApproved: function () {
            var _getDateCell = this._getDateCell,
                _getBoolean = this._getBoolean;

            return [
                {
                    label: 'Отклонение утверждено',
                    field: 'deviation_approved',
                    name: 'deviation_approved',
                    get: lang.partial(_getBoolean, 'deviation_approved'),
                    sortable: false
                },
                {label: 'Автор утверждения', field: 'approval_author', name: 'approval_author', sortable: false},
                {
                    label: 'Дата/Время утверждения',
                    field: 'approval_timestamp',
                    name: 'approval_timestamp',
                    get: lang.partial(_getDateCell, 'approval_timestamp'),
                    sortable: false
                },
                {
                    label: 'Комментарий к утверждению',
                    field: 'approval_comment',
                    name: 'approval_comment',
                    sortable: false
                }
            ];
        },

        _getDateCell: function (prop, obj) {
            if (obj[prop]) {
                return locale.format(stamp.fromISOString(obj[prop]), {
                    selector: 'date',
                    datePattern: 'dd.MM.yyyy'
                });
            } else {
                return obj[prop];
            }
        },

        _getDecimal: function (prop, obj) {
            if (obj[prop] && typeof obj[prop] != 'string') {
                return number.round(obj[prop], 3);
            } else {
                return obj[prop];
            }
        },

        _getBoolean: function (prop, obj) {
            if (obj[prop]) {
                return 'Да';
            } else {
                return 'Нет';
            }
        },

        /**
         * Build a table based on columns sets (e.g. 'Default' for this.columnsDefault etc.)
         * @param {Array} columnsSet
         */
        setDeviationGridColumns: function (columnsSets) {
            var columns = [];
            array.forEach(columnsSets, function (columnsSet) {
                columns = columns.concat(this['getColumns' + columnsSet]());
            }, this);
            this._grid.set('columns', columns);
        },

        initializeGrid: function () {
            this._grid = new GridClass({
                selectionMode: 'multiple'
            });
            this._bindGridEvents();
            this.setDeviationGridColumns(['Default']);
            domStyle.set(this._grid.domNode, 'height', '100%');
            domStyle.set(this._grid.domNode, 'border', 'none');
        },

        _bindGridEvents: function () {
            this._grid.on('.dgrid-row:dblclick', lang.hitch(this, function (evt) {
                var row = this._grid.row(evt);
                window.open(ngwConfig.compulinkMapUrl + '?resource_id=' + row.data.focl_res_id +
                    '&object_type=' + row.data.object_type +
                    '&object_num=' + row.data.object_num +
                    '&layers=design_layers', '_blank');
            }));

            this._onSelectHandling();
        },

        _gridSelectEventHandler: null,
        _dgridDeselectEventHandler: null,
        _rowClickDeselectHandler: null,
        _onSelectHandling: function () {
            this._gridSelectEventHandler = this._grid.on('dgrid-select', lang.hitch(this, this._dgridSelectEventHandle));
            this._dgridDeselectEventHandler = this._grid.on('dgrid-deselect', lang.hitch(this, this._dgridDeselectEventHandle));
            this._rowClickDeselectHandler = this._grid.on('.dgrid-row:click', lang.hitch(this, this._rowClickDeselectHandle));
        },

        _selectedObjectsId: {},
        _offSelectHandling: function () {
            this._gridSelectEventHandler.remove();
            this._dgridDeselectEventHandler.remove();
            this._rowClickDeselectHandler.remove();
        },

        _afterSelectEvent: false,
        _dgridSelectEventHandle: function (evt) {
            var row = evt.rows[0];
            this._selectedObjectsId[row.data.id] = row;
            this._enableApplyDeviationBtns();
            this._afterSelectEvent = true;
        },

        _dgridDeselectEventHandle: function (evt) {
            var row = evt.rows[0];
            delete this._selectedObjectsId[row.data.id];
            if (Object.keys(this._selectedObjectsId).length < 1) {
                this._disableApplyDeviationBtns();
            }
        },

        _rowClickDeselectHandle: function (evt) {
            if (this._afterSelectEvent) {
                this._afterSelectEvent = false;
                return false;
            }
            var row = this._grid.row(evt);
            if (this._grid.isSelected(row)) {
                this._grid.deselect(row);
            }
        },

        _enableApplyDeviationBtns: function () {
            this.applyDeviationBtn.set('disabled', false);
        },

        _disableApplyDeviationBtns: function () {
            this.applyDeviationBtn.set('disabled', 'disabled');
        },

        startup: function () {
            this.inherited(arguments);

            this.gridPane.set('content', this._grid.domNode);
            this._grid.startup();

            this.applyDeviationBtn.on('click', lang.hitch(this, function () {
                this._showApplyDeviationDialog();
            }));
        },

        _applyDeviationDialog: null,
        _showApplyDeviationDialog: function () {
            var html = '<label>Комментарий:</label><br/>' +
                '<textarea id=applyDeviationComment style=width:200px;height:60px;margin:3px;></textarea>';
            this._applyDeviationDialog = new ConfirmDialog({
                title: 'Утверждение отклонений',
                id: 'applyBulkDeviation',
                message: html,
                buttonOk: 'Утвердить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function () {
                    this._applyBulkDeviation(document.getElementById('applyDeviationComment').value);
                }),
                handlerCancel: lang.hitch(this, function () {
                    this._applyDeviationDialog = null;
                })
            });
            this._applyDeviationDialog.show();
        },

        _applyBulkDeviation: function (comment) {
            var selectObjectId,
                dataRow,
                bulkDeviationData = {
                    layers: [],
                    comment: comment
                };

            for (selectObjectId in this._selectedObjectsId) {
                if (this._selectedObjectsId.hasOwnProperty(selectObjectId)) {
                    dataRow = this._selectedObjectsId[selectObjectId].data;
                    bulkDeviationData.layers.push({
                        layerId: dataRow.focl_res_id,
                        featureId: dataRow.object_num,
                        layerType: dataRow.object_type
                    });
                }
            }

            xhr.post(route('compulink.deviation.bulk.apply'), {
                handleAs: 'json',
                data: json.stringify(bulkDeviationData)
            }).then(lang.hitch(this, function () {
                this._clearSelection();
                this.buildDeviationGrid();
            }), lang.hitch(this, function (err) {
                console.log(err);
            }));
        },

        _clearSelection: function () {
            this._grid.clearSelection();
            this._selectedObjectsId = {};
            this._disableApplyDeviationBtns();
        },

        _getValueAttr: function () {
            var value = {};

            if (this.buildingObjectsSelect.get('value')) {
                var resource_id = this.buildingObjectsSelect.get('value');
                value['resource_id'] = resource_id.replace('res_', '');
            }

            if (this.showApproved.checked) {
                value['show_approved'] = true;
            }

            return value;
        }
    });
});
