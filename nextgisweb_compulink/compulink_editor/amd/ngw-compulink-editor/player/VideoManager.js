define([
    'dojo/_base/window',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'dojox/layout/FloatingPane',
    'dijit/form/Select',
    'ngw-compulink-libs/mustache/mustache',
    'ngw-compulink-libs/vis-4.16.1/vis.min',
    'dojo/text!./templates/VideoManager.mustache',
    'ngw-compulink-editor/player/utils/ButtonClickHandler',
    'xstyle/css!./templates/VideoManager.css',
    'xstyle/css!dojox/layout/resources/FloatingPane.css',
    'xstyle/css!dojox/layout/resources/ResizeHandle.css',
    'xstyle/css!ngw-compulink-libs/font-awesome-4.6.3/css/font-awesome.min.css',
    'xstyle/css!ngw-compulink-libs/vis-4.16.1/vis.min.css',
    'xstyle/css!./templates/fontello/css/fontello.css',
    'ngw-compulink-libs/moment/moment-with-locales.min'
], function (win, declare, lang, array, domConstruct, domClass, dom, query, on,
             topic, FloatingPane, Select, mustache, vis, template, ButtonClickHandler) {
    return declare(null, {
        _timeline: null,
        _dialog: null,

        constructor: function (timeline) {
            this._timeline = timeline;
            mustache.parse(template);
            this._buildFloatingPane();
            this._bindEvents();
        },

        _bindEvents: function () {

        },

        _buildFloatingPane: function () {
            var floatingDiv = domConstruct.create('div', {id: 'videoManager'}, win.body()),
                htmlContent = mustache.render(template);

            this._dialog = new FloatingPane({
                title: 'Запись видео',
                content: htmlContent,
                closable: false,
                resizable: true,
                dockable: false,
                maxable: false,
                style: 'position:absolute;bottom:100px;right:100px;width:300px;height:160px;visibility:hidden;'
            }, floatingDiv);

            this._dialog.startup();
            this._dialog.show();
            this._dialog.bringToTop();

            this._timelineWidgetDiv = document.getElementById('timelineWidget');
        }
    });
});
