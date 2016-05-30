define([
    'dojo/_base/window',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'dojox/layout/FloatingPane',
    'ngw-compulink-libs/mustache/mustache',
    'ngw-compulink-libs/vis-4.16.1/vis.min',
    'dojo/text!./templates/Timeline.mustache',
    'xstyle/css!./templates/Timeline.css',
    'xstyle/css!dojox/layout/resources/FloatingPane.css',
    'xstyle/css!dojox/layout/resources/ResizeHandle.css',
    'xstyle/css!ngw-compulink-libs/font-awesome-4.6.3/css/font-awesome.min.css',
    'xstyle/css!ngw-compulink-libs/vis-4.16.1/vis.min.css',
    'ngw-compulink-libs/moment/moment-with-locales.min'
], function (win, declare, lang, array, domConstruct, query, on,
             topic, FloatingPane, mustache, vis, template) {
    return declare([], {
        _timelineWidgetDiv: null,
        _barId: 'currentTime',
        _featureManager: null,

        constructor: function (featuresManager) {
            mustache.parse(template);
            this._bindEvents(featuresManager);
        },

        _bindEvents: function () {
            topic.subscribe('features/manager/filled', lang.hitch(this, function (featureManager) {
                this._buildFloatingPane();
                this._buildTimeline(featureManager);
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
                style: 'position:absolute;top:100px;left:100px;width:500px;height:162px;visibility:hidden;'
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
                start: featureManager._minBuiltDate,
                end: featureManager._maxBuiltDate
            });


            var options = {
                height: '100px',
                locale: 'ru',
                stack: false,
                selectable: false
            };

            var timeline = new vis.Timeline(this._timelineWidgetDiv, new vis.DataSet(dataSetItems), options);

            timeline.addCustomTime(new Date(featureManager._minBuiltDate), this._barId);

            timeline.on('click', lang.hitch(this, function (e) {
                var start = this._normalizeDateToDay(e.time);
                timeline.setCustomTime(e.time, this._barId);
                this._buildFeatures(new Date(this._featureManager._minBuiltDate), start, true);
            }));

            timeline.on('timechanged', lang.hitch(this, function (e) {
                console.log(e);
            }));

            on(query('i.fa-play-circle', this._dialog.domNode), 'click', lang.hitch(this, function () {
                var barTime = timeline.getCustomTime(this._barId);
                this.play(barTime, 1);
            }));

            on(query('i.fa-stop-circle', this._dialog.domNode), 'click', lang.hitch(this, function () {
                this.stop();
            }));

            this._timeline = timeline;
        },

        _state: 'wait',
        _interval: null,
        play: function (start, speed) {
            this._state = 'playing';
            start = this._normalizeDateToDay(start);
            this._buildFeatures(start, new Date(this._featureManager._minBuiltDate), true);
            var intervalCounter = 1;

            this._interval = setInterval(lang.hitch(this, function () {
                var from = this._addDays(new Date(start), speed * intervalCounter - 1),
                    to = this._addDays(new Date(start), speed * intervalCounter);
                intervalCounter++;
                this._timeline.setCustomTime(to, this._barId);
                this._buildFeatures(from, to);
            }), 1000);
        },

        stop: function () {
            clearInterval(this._interval);
        },

        _buildFeatures: function (from, to, isNeedRebuild) {
            from = from.getTime();
            to = to ? to.getTime() : from;
            if (to < from) {
                var newFrom = to;
                to = from;
                from = newFrom;
            }
            var currentDate = from,
                featuresDaySet, featuresDaySetMs,
                featuresByBuiltDate = this._featureManager._featuresByBuiltDate,
                layer = this._featureManager._layer;

            if (isNeedRebuild) {
                layer.removeAllFeatures();
            }

            for (featuresDaySetMs in featuresByBuiltDate) {
                if (featuresByBuiltDate.hasOwnProperty(featuresDaySetMs)) {
                    featuresDaySetMs = parseInt(featuresDaySetMs, 10);
                    if (from <= featuresDaySetMs && featuresDaySetMs < to) {
                        layer.addFeatures(featuresByBuiltDate[featuresDaySetMs]);
                    }
                }
            }
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