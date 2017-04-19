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
    'ngw-compulink-editor/player/utils/ButtonClickHandler',
    'ngw-compulink-site/ConfirmDialog',
    'ngw-compulink-site/InfoDialog',
    'ngw-compulink-editor/player/VideoOverwriteDialog/VideoOverwriteDialog'
], function (win, declare, lang, array, locale, domConstruct, domClass,
             dom, query, on, topic, mustache, template, ButtonClickHandler,
             ConfirmDialog, InfoDialog, VideoOverwriteDialog) {
    return declare([], {
        _videoMode: null,
        CHECK_STATUS_INTERVAL: 5000,

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
                case 'none':
                    this._setNoneMode(mode);
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
            date = locale.format(date, {selector:'date', datePattern: 'dd.MM.yyyy' } );

            $.extend(templateData, videoInfoDetail);
            templateData.date = date;

            videoInfoDetail['message'] = mustache.render(this._readyMessageTemplate, templateData);

            this._renderTemplate(mode, videoInfoDetail);
            this._bindMakeVideoEvent();
        },
        
        _setNoneMode: function (mode) {
            var detail = {
                message: 'Нажмите кнопку для<br/>формирования видео-файла',
                modeClass: 'mode-none'
            };
            this._renderTemplate(mode, detail);
            this._bindMakeVideoEvent();
        },

        _bindMakeVideoEvent: function () {
            this._buttonsHandlers.makeVideo = new ButtonClickHandler(
                query('a.icon-videocam-2', this._dialog.domNode)[0],
                lang.hitch(this, function () {
                    if (this._videoMode === 'ready') {
                        this._verifyDuration(this._buildOverwriteVideoDialog);
                    } else {
                        this._verifyDuration(this._buildMakeVideoDialog);
                    }
                }),
                true
            );
        },

        warningDurationSec: 300,
        criticalDurationSec: 3600,
        _verifyDuration: function (callback) {
            var duration = this.getPlayingDurationInSec();

            if (duration < this.warningDurationSec) {
                callback.call(this);
            } else if (duration >= this.warningDurationSec && duration < this.criticalDurationSec) {
                this._buildWarningDurationDialog(callback);
            } else {
                this._buildDisableRecordingDialog(duration);
            }
        },

        _buildWarningDurationDialog: function (callback) {
            var warningDurationDialog = new ConfirmDialog({
                title: 'Внимание!',
                id: 'warningDuration',
                message: 'Продолжительность результирующего видео будет больше ' +
                    Math.ceil(this.warningDurationSec / 60) +
                    ' минут.<br/>Увеличьте скорость проигрывания перед формированием файла.',
                buttonOk: 'Продолжить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, callback)
            });
            warningDurationDialog.show();
        },

        _buildDisableRecordingDialog: function (duration) {
            var durationInMin = duration / 60,
                durationStr;
            if (duration < 60) {
                durationStr = durationInMin + ' минут.';
            } else {
                durationStr = (durationInMin / 60).toFixed(1) + ' часов.';
            }

            new InfoDialog({
                isDestroyedAfterHiding: true,
                title: 'Внимание!',
                message: 'Продолжительность результирующего видео будет около ' +
                    durationStr +
                    '<br/>Формирование файла может занять продолжительное время.'
            }).show();
        },

        _buildOverwriteVideoDialog: function () {
            var videoOverwriteDialog = new VideoOverwriteDialog({
                title: 'Запись видео',
                id: 'overwriteVideo',
                buttonOk: 'ОК',
                buttonCancel: 'Отменить',
                url: $(this._dialog.domNode).find('a.icon-download-alt').one().attr('href'),
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, this._makeVideo),
                handlerCancel: lang.hitch(this, function () {
                })
            });
            videoOverwriteDialog.show();
        },

        _buildMakeVideoDialog: function () {
            var makeVideoItemDialog = new ConfirmDialog({
                title: 'Запись видео',
                id: 'makeVideo',
                message: 'Записать новый видео-файл с текущими параметрами проигрывания?<br/> По окончании записи видео-файл станет доступным для скачивания.',
                buttonOk: 'ОК',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, this._makeVideo),
                handlerCancel: lang.hitch(this, function () {
                })
            });
            makeVideoItemDialog.show();
        },

        _makeVideo: function () {
            var recordingVideoParams = this.getRecordingVideoParams();
            this._changeMode('creating');
            this._ngwServiceFacade.makeVideo(recordingVideoParams).then(
                lang.hitch(this, function () {
                    this._startUpdateTimer();
                }),
                lang.hitch(this, function () {
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Запись видео',
                        message: 'Записать новое видео не удалось. Попробуйте еще раз.',
                        handlerOk: lang.hitch(this, function () {
                            this._changeMode('error');
                        })
                    }).show();
                })
            );
        },

        _startUpdateTimer: function () {
            var timerId = setInterval(lang.hitch(this, function () {
                this._ngwServiceFacade.getVideoStatus(this._featureManager._resourceId)
                    .then(lang.hitch(this, function (videoInfo) {
                        if (videoInfo.status === 'ready' || videoInfo.status == 'error') {
                            clearInterval(timerId);
                            this._changeMode(videoInfo.status, videoInfo);
                        }
                    }));
            }), this.CHECK_STATUS_INTERVAL);
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
            this._bindMakeVideoEvent();
        },

        _getVideoStatus: function () {
            this._ngwServiceFacade.getVideoStatus(this._featureManager._resourceId)
                .then(lang.hitch(this, function (videoInfo) {
                    this._changeMode(videoInfo.status, videoInfo);
                }));
        }
    })
});