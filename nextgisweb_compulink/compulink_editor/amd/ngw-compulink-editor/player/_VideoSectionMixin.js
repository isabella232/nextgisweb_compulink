define([
    'dojo/_base/window',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/date/locale',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/VideoSection.mustache',
    'ngw-compulink-editor/player/utils/ButtonClickHandler'
], function (win, declare, lang, array, locale, domConstruct, domClass, dom, query, on,
             topic, mustache, template, ButtonClickHandler) {
    return declare([], {
        _videoMode: null,

        initVideoSection: function () {
            this._changeMode('init');
            this._getVideoStatus();
        },

        _changeMode: function (mode, detail) {
            if (this._videoMode === mode) return false;

            this._resetPreviousMode();

            switch (mode) {
                case 'init':
                    this._setInitMode(mode);
                    break;
                case 'ready':
                    this._setReadyMode(mode, detail);
                    break;
                case 'creating':
                    this._setCreatingMode(mode);
                    break;
                case 'error':
                    this._setErrorMode(mode);
                    break;
                default:
                    console.error(new Exception('Wrong _VideoSection mode: ' + mode));
            }

            this._videoMode = mode;
        },

        _resetPreviousMode: function () {
        },

        _renderTemplate: function (mode, detail) {
            var templateMode = 'mode-' + mode,
                templateInfo = {},
                videoSectionHtml;

            templateInfo[templateMode] = true;

            if (detail) {
                $.extend(templateInfo, detail);
            }

            videoSectionHtml = mustache.render(template, templateInfo);
            $(this._dialog.domNode).find('div.video-section').one().replaceWith(videoSectionHtml);
        },

        _setInitMode: function (mode) {
            this._renderTemplate(mode);
        },

        _readyMessageTemplate: 'Файл сформирован.</br>Дата: {{date}}</br>Размер: {{size}}</br>',
        _setReadyMode: function (mode, videoInfoDetail) {
            var date = new Date(videoInfoDetail.created_date_time),
                templateData = {};
            date = locale.format(date, {selector:"date", datePattern: 'dd.MM.yyyy' } );

            $.extend(templateData, videoInfoDetail);
            templateData.date = date;

            videoInfoDetail['message'] = mustache.render(this._readyMessageTemplate, templateData);

            this._renderTemplate(mode, videoInfoDetail);
        },

        _setCreatingMode: function (mode) {
            var detail = {
                message: 'Формирование файла </br> Ждите...'
            };
            this._renderTemplate(mode, detail);
        },

        _setErrorMode: function (mode) {
            var detail = {
                message: 'Записать новое видео не удалось. Попробуйте еще раз.'
            };
            this._renderTemplate(mode, detail);
        },

        _getVideoStatus: function () {
            this._ngwServiceFacade.getVideoStatus(this._featureManager._resourceId)
                .then(lang.hitch(this, function (videoInfo) {
                    this._changeMode(videoInfo.status, videoInfo);
                }));
        }
    })
});