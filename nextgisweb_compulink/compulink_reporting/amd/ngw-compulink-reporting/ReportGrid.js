define([
    "dojo/_base/declare",
    "dojo/_base/lang",
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
    "dgrid/extensions/DijitRegistry",
    //settings
    "ngw/settings!compulink_admin",
    //style
    "ngw/dgrid/css",
    //template
    "dijit/form/CheckBox",
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dojox/layout/TableContainer",
    "ngw-compulink-reporting/RegionSelect",
    "ngw-compulink-reporting/DistrictSelect",
    "ngw-compulink-reporting/StatusSelect"
], function (
    declare,
    lang,
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
    DijitRegistry,
    settings
) {
    // Базовый класс ggrid над которым затем делается обертка в dijit виджет
    var GridClass = declare([Grid, DijitRegistry], {});
    
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

            // Синхронизируем выпадающие списки субъектов и регионов
            this.regionSelect.watch('value', function(attr, oldValue, newValue) {
                w.districtSelect.query.parent_id = newValue;
                w.districtSelect.set('value',
                    w.districtSelect.store.getIdentity(
                        w.districtSelect.store.query({
                            'parent_id': newValue
                        })[0]));
            });

            // По умолчанию из списка выбираем первый регион
            this.regionSelect.set('value',
                w.regionSelect.store.getIdentity(
                    w.regionSelect.store.data[0]
                ));

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

        },

        initializeGrid: function() {
            var columns = [
                {field: "focl_name", label: "Наименование ВОЛС"},
                {field: "region", label: "Субъект РФ"},
                {field: "district", label: "Муниципальный район"},
                {field: "status", label: "Статус строительства"},
                {field: "subcontr_name", label: "Подрядчик"}
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
            var value = {
                'region': this.regionSelect.get('value'),
                'district': this.districtSelect.get('value'),
                'status': this.statusSelect.get('value')
            }
            if (this.onlyOverdue.checked) {
                value['only_overdue'] = true;
            }

            return value;
        }
    });
});
