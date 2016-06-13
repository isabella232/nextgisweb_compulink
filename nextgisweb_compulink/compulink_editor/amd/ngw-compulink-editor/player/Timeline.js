define([
    'dojo/_base/window',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/dom',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'dojox/layout/FloatingPane',
    'dijit/form/Select',
    'ngw-compulink-libs/mustache/mustache',
    'ngw-compulink-libs/vis-4.16.1/vis.min',
    'dojo/text!./templates/Timeline.mustache',
    'xstyle/css!./templates/Timeline.css',
    'xstyle/css!dojox/layout/resources/FloatingPane.css',
    'xstyle/css!dojox/layout/resources/ResizeHandle.css',
    'xstyle/css!ngw-compulink-libs/font-awesome-4.6.3/css/font-awesome.min.css',
    'xstyle/css!ngw-compulink-libs/vis-4.16.1/vis.min.css',
    'ngw-compulink-libs/moment/moment-with-locales.min'
], function (win, declare, lang, array, domConstruct, dom, query, on,
             topic, FloatingPane, Select, mustache, vis, template) {
    return declare([], {
        _timelineWidgetDiv: null,
        _barId: 'currentTime',
        _featureManager: null,
        _countUnitSelector: null,
        _countUnits: [
            {label: '1', value: '1'},
            {label: '5', value: '5'},
            {label: '10', value: '10'},
            {label: '15', value: '15'},
            {label: '30', value: '30'},
            {label: '60', value: '60'},
            {label: '90', value: '90'}
        ],
        _unitsSelector: null,
        _units: [
            {label: 'минут', value: 'Minutes'},
            {label: 'часов', value: 'Hours'},
            {label: 'дней', value: 'Days'},
            {label: 'месяцев', value: 'Months'}
        ],

        constructor: function (featuresManager) {
            mustache.parse(template);
            this._bindEvents(featuresManager);
        },

        _bindEvents: function () {
            topic.subscribe('features/manager/filled', lang.hitch(this, function (featureManager) {
                this._buildFloatingPane();
                this._buildTimeline(featureManager);
                this._buildSpeedSelectors();
            }));
        },

        _buildFloatingPane: function () {
            var floatingDiv = domConstruct.create('div', {id: 'timeline'}, win.body()),
                htmlContent = mustache.render(template);
            this._dialog = new FloatingPane({
                title: 'Плеер',
                content: htmlContent,
                closable: false,
                resizable: true,
                dockable: false,
                maxable: false,
                style: 'position:absolute;top:100px;left:100px;width:500px;height:160px;visibility:hidden;'
            }, floatingDiv);
            this._dialog.startup();
            this._dialog.show();
            this._dialog.bringToTop();

            this._timelineWidgetDiv = document.getElementById('timelineWidget');
        },

        _buildTimeline: function (featureManager) {
            var dataSetItems = [];

            this._featureManager = featureManager;

            array.forEach(featureManager._layer.features, function (feature) {
                dataSetItems.push({
                    id: feature.id,
                    content: '',
                    start: feature.attributes.built_date
                });
            });

            dataSetItems.push({
                id: 'rangeBuilt',
                content: '',
                start: featureManager.minBuiltDate,
                end: featureManager.maxBuiltDate
            });


            var options = {
                height: '100px',
                locale: 'ru',
                stack: false,
                selectable: false
            };

            var timeline = new vis.Timeline(this._timelineWidgetDiv, new vis.DataSet(dataSetItems), options);

            timeline.addCustomTime(new Date(featureManager.minBuiltDate), this._barId);

            timeline.on('click', lang.hitch(this, function (timeChangedEvent) {
                this._handleTimeChanged(timeChangedEvent);
            }));

            timeline.on('timechanged', lang.hitch(this, function (timeChangedEvent) {
                this._handleTimeChanged(timeChangedEvent);
            }));

            this._timeline = timeline;
            this._bindPlayerControlsEvents();
            this._moveTimeBarToStart();
        },

        _handleTimeChanged: function (timeChangedEvent) {
            this.stop();
            this._timeline.setCustomTime(timeChangedEvent.time, this._barId);
            this._buildFeatures(this._featureManager.minBuiltDate, timeChangedEvent.time, true);
        },

        _bindPlayerControlsEvents: function () {
            on(query('i.fa-play-circle', this._dialog.domNode), 'click', lang.hitch(this, function () {
                this.play(this._timeline.getCustomTime(this._barId));
            }));

            on(query('i.fa-stop-circle', this._dialog.domNode), 'click', lang.hitch(this, function () {
                this.stop();
            }));

            on(query('i.fa-fast-backward', this._dialog.domNode), 'click', lang.hitch(this, function () {
                this._moveTimeBarToStart();
            }));

            on(query('i.fa-fast-forward', this._dialog.domNode), 'click', lang.hitch(this, function () {
                this._handleTimeChanged({
                    time: this._featureManager.maxBuiltDate
                });
            }));
        },

        _moveTimeBarToStart: function () {
            this._handleTimeChanged({
                time: this._featureManager.minBuiltDate
            });
        },

        _buildSpeedSelectors: function () {
            this._unitsSelector = new Select({
                name: 'unitsSelector',
                options: this._units
            });
            this._unitsSelector.placeAt(dom.byId('unitsSelector')).startup();

            this._unitsSelector.on('change', lang.hitch(this, function (changedEvent) {
                this.stop();
            }));

            this._countUnitSelector = new Select({
                name: 'countUnitSelector',
                options: this._countUnits
            });
            this._countUnitSelector.placeAt(dom.byId('countUnitSelector')).startup();

            this._countUnitSelector.on('change', lang.hitch(this, function (changedEvent) {
                this.stop();
            }));
        },

        _state: 'wait',
        _interval: null,
        play: function (start) {
            this._state = 'playing';
            if (start < this._featureManager.minBuiltDate) {
                this._moveTimeBarToStart();
                start = this._featureManager.minBuiltDate;
            }
            var tick = 1,
                units = this._unitsSelector.get('value'),
                countUnits = parseInt(this._countUnitSelector.get('value'), 10),
                intervalTimeByTick;

            this._interval = setInterval(lang.hitch(this, function () {
                intervalTimeByTick = this._getIntervalTimeByTick(start, tick, units, countUnits);
                tick++;
                this._timeline.setCustomTime(intervalTimeByTick.to, this._barId);
                this._buildFeatures(intervalTimeByTick.from, intervalTimeByTick.to);
            }), 1000);
        },

        _getIntervalTimeByTick: function (startDate, tick, units, countUnits) {
            return {
                from: this['add' + units](startDate, (tick - 1) * countUnits),
                to: this['add' + units](startDate, tick * countUnits)
            }
        },

        addMinutes: function (date, minutes) {
            var clonedDate = new Date(date.getTime());
            clonedDate.setMinutes(clonedDate.getMinutes() + minutes);
            return clonedDate;
        },

        addHours: function (date, hours) {
            var clonedDate = new Date(date.getTime());
            clonedDate.setHours(clonedDate.getHours() + hours);
            return clonedDate;
        },

        addMonths: function (date, months) {
            var clonedDate = new Date(date.getTime());
            clonedDate.setMonth(clonedDate.getMonth() + months);
            return clonedDate;
        },

        addDays: function (date, days) {
            var clonedDate = new Date(date.getTime());
            clonedDate.setDate(clonedDate.getDate() + days);
            return clonedDate;
        },

        stop: function () {
            if (this._interval) {
                clearInterval(this._interval);
            }
        },

        _currentIndexDate: null,
        _buildFeatures: function (from, to, isNeedRebuild) {
            var layer = this._featureManager._layer,
                featureBuiltDateMs;

            if (isNeedRebuild) {
                layer.removeAllFeatures();
            }

            from = from.getTime();
            to = to ? to.getTime() : from;

            if (to < from) {
                var newFrom = to;
                to = from;
                from = newFrom;
            }

            array.forEach(this._featureManager._featuresByBuiltDate, function (feature, index) {
                featureBuiltDateMs = feature.attributes.built_date_ms;
                if (featureBuiltDateMs <= from) {
                    return true;
                } else if  (featureBuiltDateMs > from  && featureBuiltDateMs <= to) {
                    layer.addFeatures(feature);
                } else if (featureBuiltDateMs > to) {
                    this._currentIndexDate = index - 1;
                    return false;
                }
            }, this);
        },

        _normalizeDateToDay: function (dateTime) {
            if (dateTime.getHours() !== 0 || dateTime.getMinutes() !== 0 || dateTime.getSeconds() !== 0) {
                dateTime.setDate(dateTime.getDate() + 1);
            }
            dateTime.setHours(0, 0, 0, 0);
            return dateTime;
        },

        _addDays: function (date, days) {
            var result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }
    });
});