define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/request/xhr",
    "dojo/dom-style",
    "dojo/_base/array",
    "dojo/io-query",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/date/locale",
    "dojo/date/stamp",
    "dojo/number",
    "dijit/layout/BorderContainer",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/DeviationGrid.html",
    "ngw/route",
    //grid
    "dgrid/Grid",
    "dgrid/Selection",
    "dgrid/ColumnSet",
    "dgrid/extensions/DijitRegistry",
    "dgrid/extensions/CompoundColumns",
    "dgrid/extensions/ColumnResizer",
    //style
    "ngw/dgrid/css",
    "xstyle/css!./resources/DeviationGrid.css",
    //template
    "dijit/form/CheckBox",
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dojox/layout/TableContainer",
    "ngw-compulink-reporting/RegionSelect",
    "ngw-compulink-reporting/DistrictSelect",
    "ngw-compulink-reporting/StatusSelect",
    "ngw-compulink-site/DisplayHeader",
    "dijit/Toolbar"
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
             BorderContainer,
             _TemplatedMixin,
             _WidgetsInTemplateMixin,
             template,
             route,
             Grid,
             Selection,
             ColumnSet,
             DijitRegistry,
             CompoundColumns,
             ColumnResizer) {
    // Базовый класс ggrid над которым затем делается обертка в dijit виджет
    var GridClass = declare([Grid, DijitRegistry, CompoundColumns, ColumnResizer], {});

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
                if (checked) {
                    this.setDeviationGridColumns(['Default', 'Approved']);
                } else {
                    this.setDeviationGridColumns(['Default']);
                }
                this.buildDeviationGrid();
            }));

            this.buildingObjectsSelect.on('change', lang.hitch(this, function () {
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
                {label: 'Наименование ВОЛС', field: 'focl_name', name: 'focl_name', sortable: false},
                {label: 'Тип объекта', field: 'object_type_name', name: 'object_type_name', sortable: false},
                {label: 'Номер объекта', field: 'object_num', name: 'object_num', sortable: false},
                {label: 'Отклонение в метрах', field: 'deviation_distance', name: 'deviation_distance', sortable: false}
            ];
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
                    get: lang.partial(_getDateCell, 'start_build_time'),
                    sortable: false
                },
                {
                    label: 'Комментарий к отклонению',
                    field: 'approval_comment',
                    name: 'approval_comment',
                    sortable: false
                }
            ];
        },

        _getDateCell: function (prop, obj) {
            if (obj[prop]) {
                return locale.format(stamp.fromISOString(obj[prop]), {
                    selector: "date",
                    datePattern: "dd.MM.yyyy"
                });
            } else {
                return obj[prop];
            }
        },

        _getDecimal: function (prop, obj) {
            if (obj[prop] && typeof obj[prop] != "string") {
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
            this._grid.set("columns", columns);
        },

        initializeGrid: function () {
            this._grid = new GridClass();
            this.setDeviationGridColumns(['Default']);
            domStyle.set(this._grid.domNode, "height", "100%");
            domStyle.set(this._grid.domNode, "border", "none");
        },

        startup: function () {
            this.inherited(arguments);

            this.gridPane.set("content", this._grid.domNode);
            this._grid.startup();
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
