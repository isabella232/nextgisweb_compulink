define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/request/xhr",
    "dojo/dom-style",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/layout/BorderContainer",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./template/ReportGrid.html",
    "ngw/route",
    //grid
    "dgrid/Grid",
    "dgrid/Selection",
    "dgrid/ColumnSet",
    "dgrid/extensions/DijitRegistry",
    "dgrid/extensions/CompoundColumns",
    //settings
    "ngw/settings!compulink_admin",
    //style
    "ngw/dgrid/css",
    "xstyle/css!./resource/ReportGrid.css",
    //template
    "dijit/form/CheckBox",
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dojox/layout/TableContainer",
    "ngw-compulink-reporting/RegionSelect",
    "ngw-compulink-reporting/DistrictSelect",
    "ngw-compulink-reporting/StatusSelect",
    "ngw-compulink-site/DisplayHeader"
], function (
    declare,
    lang,
    aspect,
    xhr,
    domStyle,
    Memory,
    Observable,
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
    ColumnResizer,
    settings
) {
    // Базовый класс ggrid над которым затем делается обертка в dijit виджет
    var GridClass = declare([Grid, DijitRegistry, CompoundColumns], {});
    
    return declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        gutters: true,
        templateString: template,

        constructor: function (params) {
            declare.safeMixin(this, params);
            this.initializeGrid();
        },

        postCreate: function () {
            this.inherited(arguments);

            var w = this,
                rs = w.regionSelect, rss = rs.store,
                ds = w.districtSelect, dss = ds.store;

            rss.data.unshift({'id': '-', 'name': 'Все'});
            dss.data.unshift({'id': '-', 'name': 'Все'});
            rss.setData(rss.data);
            dss.setData(dss.data);

            // Синхронизируем выпадающие списки субъектов и регионов
            ds.set('_store', lang.clone(dss));
            rs.watch('value', function(attr, oldValue, newValue) {
                if (newValue == '-') {
                    ds.set('disabled', true);
                } else {
                    ds.set('disabled', false);
                    var fdata = ds._store.query(function (d) {
                        return ((d.parent_id == newValue) ||
                                (d.id == '-'))});
                    dss.setData(fdata);

                    // Из списка районов выбираем первый элемент
                    ds.set('value', dss.getIdentity(dss.data[0]));
                }
            });

            // Обрабатываем нажатие кнопки
            this.buildReport.on('click', function() {
                xhr(route.compulink.reporting.get_status_report(), {
                    method: 'GET',
                    handleAs: 'json',
                    query: w.get('value')
                }).then(lang.hitch(this, function(data) {
                    w._grid.refresh();
                    w._grid.renderArray(data);
                }));
            });

            // Из списка регионов выбираем первый элемент
            rs.set('value', rss.getIdentity(rss.data[0]));

            // Меняем цвет строки для просроченных объектов
            aspect.after(w._grid, "renderRow", function(row, args) {
                if (args[0]['is_overdue']) {
                    domStyle.set(row, "background-color", "#ff6666");
                }
                return row;
            });
        },

        initializeGrid: function() {
            var columns = [
                {label: 'Наименование ВОЛС', field: 'focl_name', name: 'focl_name'},
                {label: 'Субъект РФ', field: 'region', name: 'region'},
                {label: 'Муниципальный район', field: 'district', name: 'district'},
                {label: 'Статус', field: 'status', name: 'status'},
                {label: 'Подрядчик', field: 'subcontr_name', name: 'subcontr_name'},
                {label: 'Плановые сроки выполнения СМР',
                    children: [
                        {label: 'Начало', field: 'start_build_time', name: 'start_build_time'},
                        {label: 'Окончание', field: 'end_build_time', name: 'end_build_time'}
                    ]
                },
                {label: 'Прокладка ОК',
                    children: [
                        {label: 'План, км', field: 'cabling_plan', name: 'cabling_plan'},
                        {label: 'Факт, км', field: 'cabling_fact', name: 'cabling_fact'},
                        {label: '%', field: 'cabling_percent', name: 'cabling_percent'}
                    ]
                },
                {label: 'Разварка муфт',
                    children: [
                        {label: 'План, шт', field: 'fosc_plan', name: 'fosc_plan'},
                        {label: 'Факт, шт', field: 'fosc_fact', name: 'fosc_fact'},
                        {label: '%', field: 'fosc_percent', name: 'fosc_percent'}
                    ]
                },
                {label: 'Разварка кроссов',
                    children: [
                        {label: 'План, шт', field: 'cross_plan', name: 'cross_plan'},
                        {label: 'Факт, шт', field: 'cross_fact', name: 'cross_fact'},
                        {label: '%', field: 'cross_percent', name: 'cross_percent'}
                    ]
                },
                {label: 'Строительство ГНБ переходов',
                    children: [
                        {label: 'План, шт', field: 'spec_trans_plan', name: 'spec_trans_plan'},
                        {label: 'Факт, шт', field: 'spec_trans_fact', name: 'spec_trans_fact'},
                        {label: '%', field: 'spec_trans_percent', name: 'spec_trans_percent'}
                    ]
                },
                {label: 'Монтаж точек доступа',
                    children: [
                        {label: 'План, шт', field: 'ap_plan', name: 'ap_plan'},
                        {label: 'Факт, шт', field: 'ap_fact', name: 'ap_fact'},
                        {label: '%', field: 'ap_percent', name: 'ap_percent'}
                    ]
                }
            ];

            this._grid = new GridClass({
                columns: columns
            });

            domStyle.set(this._grid.domNode, "height", "100%");
            domStyle.set(this._grid.domNode, "border", "none");
        },

        startup: function () {
            this.inherited(arguments);

            this.gridPane.set("content", this._grid.domNode);
            this._grid.startup();
        },

        _getValueAttr: function() {
            var value = {};

            value['status'] = this.statusSelect.get('value');

            if (this.regionSelect.get('value') !== '-') {
                value['region'] = this.regionSelect.get('value');
                if (this.districtSelect.get('value') !== '-') {
                    value['district'] = this.districtSelect.get('value');
                }
            }

            if (this.onlyOverdue.checked) {
                value['only_overdue'] = true;
            }

            return value;
        }
    });
});
