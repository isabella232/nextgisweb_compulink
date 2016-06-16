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

            var w = this;

            // Обрабатываем нажатие кнопки 'Построить'
            this.buildReport.on('click', function () {
                xhr(route.compulink.reporting.get_deviation_data(), {
                    method: 'GET',
                    handleAs: 'json',
                    query: w.get('value')
                }).then(lang.hitch(this, function (data) {
                    w._grid.refresh();
                    w._grid.renderArray(data);
                }));
            });

            // Обрабатываем нажатие кнопки 'Выгрузить в Excel'
            //this.exportExcel.on('click', function() {
            //    var url = route.compulink.reporting.export_status_report();
            //        queryStr = ioQuery.objectToQuery(w.get('value'));
            //    window.open(url + '?' + queryStr, '_blank');
            //});

            this.showApproved.on('change', lang.hitch(this, function (checked) {
                if (checked) {
                    this.buildTable(['Default', 'Approved']);
                } else {
                    this.buildTable(['Default']);
                }
            }));
        },

        columnsDefault: [
            {label: 'Наименование ВОЛС', field: 'focl_name', name: 'focl_name', sortable: false},
            {label: 'Тип объекта', field: 'object_type', name: 'object_type', sortable: false},
            {label: 'Номер объекта', field: 'object_number', name: 'object_number', sortable: false},
            {label: 'Отклонение в метрах', field: 'deviation_meters', name: 'deviation_meters', sortable: false}
        ],

        columnsApproved: [
            {label: 'Отклонение утверждено', field: 'deviation_approved', name: 'deviation_approved', sortable: false},
            {label: 'Автор утверждения', field: 'approval_author', name: 'approval_author', sortable: false},
            {
                label: 'Дата/Время утверждения',
                field: 'approval_timestamp',
                name: 'approval_timestamp',
                get: lang.partial(this._getDateCell, 'start_build_time'),
                sortable: false
            },
            {label: 'Комментарий к отклонению', field: 'approval_comment', name: 'approval_comment', sortable: false}
        ],

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

        /**
         * Build a table based on columns sets (e.g. 'Default' for this.columnsDefault etc.)
         * @param {Array} columnsSet
         */
        buildTable: function (columnsSets) {
            var columns = [];
            array.forEach(columnsSets, function (columnsSet) {
                columns = columns.concat(this['columns' + columnsSet]);
            }, this);
            this._grid.set("columns", columns);
        },

        initializeGrid: function () {
            this._grid = new GridClass();
            this.buildTable(['Default']);
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
