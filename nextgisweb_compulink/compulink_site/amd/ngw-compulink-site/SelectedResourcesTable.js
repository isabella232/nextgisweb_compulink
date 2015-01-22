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
    "dojo/store/Memory"
], function (declare, lang, topic, Deferred, xhr, registry, mustache, OnDemandGrid, ColumnResizer, Memory) {
    return declare(null, {

        _columns: {
                display_name: 'Название ВОЛС',
                region: 'Субъект РФ',
                district: 'Муниципальный район',
                settlement: 'Нас. пункт',
                access_point_count: 'Кол-во точек доступа',
                deadline_contract: 'Срок сдачи по договору',
                project_manager: 'Рук. проекта',
                focl_length_order: 'Протяж. ВОЛС по заказу',
                focl_length_project: 'Протяж. ВОЛС по проекту',
                focl_length_fact: 'Протяж. ВОЛС фактическая',
                length_on_ol: 'Протяж. по ВЛ',
                length_in_ground: 'Протяж. в грунте',
                length_in_canalization: 'Протяж. в каб. канализации',
                customer: 'Заказчик строительства',
                planned_start_date: 'План. дата начала СМР',
                planned_finish_date: 'План. дата окончания СМР',
                subcontr: 'Суб-чик СМР ВОЛС'
        },

        _url: ngwConfig.applicationUrl + '/compulink/resources/focl_info?ids=',

        constructor: function (domId) {
            this._store = Memory({data: []});

            this._grid = new (declare([OnDemandGrid, ColumnResizer]))(
                {
                    store: this._store,
                    columns: this._columns,
                    loadingMessage: 'Загрузка данных...',
                    noDataMessage: 'Нет выбранных элементов'
                }, domId);

            //this._grid.startup();

            this.bindEvents();
        },

        bindEvents: function () {
            topic.subscribe('resources/changed', lang.hitch(this, function (selection) {
                this.updateDataStore(selection);
            }));
        },

        updateDataStore: function(ids) {
            ids_str = ids.join(',').replace(new RegExp('res_','g'),'');
            xhr.get(this._url+ids_str, {handleAs: 'json'}).then(lang.hitch(this, function (data) {
                this._store.data = data;
                this._grid.refresh();
            }));
        }
    });
});