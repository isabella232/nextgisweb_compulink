define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    "dijit/registry",
    'ngw-compulink-libs/mustache/mustache',
    'dgrid/OnDemandGrid',
    'dgrid/extensions/ColumnResizer',
    "dojo/store/Memory",
    "dgrid/Selection",
    "dijit/Menu",
    "dijit/MenuItem"
], function (declare, lang, topic, Deferred, xhr, registry, mustache, OnDemandGrid, ColumnResizer, Memory, Selection, Menu, MenuItem) {
    return declare(null, {

        _columns: {
                display_name: 'Наименование',
                region: 'Субъект РФ',
                district: 'Муниципальный район',
                settlement: 'Нас. пункт',
                access_point_count: 'Кол-во точек доступа',
                need_construct: 'Требуется строительство',
                point_a: 'Точка А',
                point_b: 'Точка Б',
                focl_length: 'Протяженность ВОЛС',
                start_build_time: 'Строительство ВОЛС (начало)',
                end_build_time: 'Строительство ВОЛС (окончание)',
                start_exp_time: 'Сдача ВОЛС в эксплуатацию (начало)',
                end_exp_time: 'Сдача ВОЛС в эксплуатацию (окончание)',
                subcontr: 'Субподрядчик СМР ВОЛС'
        },

        _get_focl_info_url: ngwConfig.applicationUrl + '/compulink/resources/focl_info',
        _get_extent_url: ngwConfig.applicationUrl + '/compulink/resources/focl_extent',

        _get_ext_focl_info_url: ngwConfig.applicationUrl + '/compulink/mssql/get_focl_info',


        constructor: function (domId) {
            this._store = Memory({data: []});

            //grid
            this._grid = new (declare([OnDemandGrid, ColumnResizer, Selection]))(
                {
                    store: this._store,
                    columns: this._columns,
                    selectionMode: "single",
                    loadingMessage: 'Загрузка данных...',
                    noDataMessage: 'Нет выбранных элементов'
                }, domId);

            //context menu
            this._menu = new Menu({
                targetNodeIds: [this._grid.domNode],
                selector: "div.dgrid-row"

            });

            this._menu.addChild(new MenuItem({
                label: "Экспорт в KML",
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + "/compulink/resources/" + item + "/export_kml";
                    var win = window.open(exportUrl, '_blank');
                })
            }));

            this._menu.addChild(new MenuItem({
                label: "Экспорт в GeoJSON",
                onClick: lang.hitch(this, function(evt) {
                    evt.preventDefault();
                    var item = Object.getOwnPropertyNames( this._grid.selection )[0];
                    var exportUrl = ngwConfig.applicationUrl + "/compulink/resources/" + item + "/export_geojson";
                    var win = window.open(exportUrl, '_blank');
                })
            }));


            //this._grid.startup();

            this.bindEvents();
        },

        bindEvents: function () {
            topic.subscribe('resources/changed', lang.hitch(this, function (selection) {
                this.updateDataStore(selection);
            }));

            this._grid.on(".dgrid-row:dblclick", lang.hitch(this, function (evt) {
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

                //update extra fields
                ext_ids_num = [];
                for(var i=0; i<this._store.data.length; i++)
                {
                    if(this._store.data[i]['external_id']!=null)
                        ext_ids_num.push(this._store.data[i]['external_id']);
                };
                xhr.post(this._get_ext_focl_info_url, {handleAs: 'json', data: {ids: ext_ids_num}}).then(lang.hitch(this, function (data) {
                    for(var i=0; i<data.length; i++) {
                        ext_id = data[i]['external_id'];
                        for(var j=0; j<this._store.data.length; j++)
                        {
                            if(ext_id==this._store.data[j]['external_id']) {
                                lang.mixin(this._store.data[j], data[i])
                                break;
                            }
                        }
                    };
                    this._grid.refresh();
                }));

            }));
        }
    });
});