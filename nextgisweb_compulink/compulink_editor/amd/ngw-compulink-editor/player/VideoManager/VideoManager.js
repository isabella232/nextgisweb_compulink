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
    'dojo/text!./VideoManager.mustache',
    'dojo/text!./VideoItems.mustache',
    'ngw-compulink-editor/editor/NgwServiceFacade',
    'ngw-compulink-editor/player/utils/ButtonClickHandler',
    'ngw-compulink-site/ConfirmDialog',
    'ngw-compulink-site/InfoDialog',
    'xstyle/css!./VideoManager.css',
    'xstyle/css!dojox/layout/resources/FloatingPane.css',
    'xstyle/css!dojox/layout/resources/ResizeHandle.css',
    'xstyle/css!ngw-compulink-libs/font-awesome-4.6.3/css/font-awesome.min.css',
    'xstyle/css!ngw-compulink-libs/vis-4.16.1/vis.min.css',
    'xstyle/css!../templates/fontello/css/fontello.css',
    'ngw-compulink-libs/moment/moment-with-locales.min'
], function (win, declare, lang, array, domConstruct, domClass, dom, query, on,
             topic, FloatingPane, Select, mustache, vis, template, videoItemsTemplate,
             NgwServiceFacade, ButtonClickHandler, ConfirmDialog, InfoDialog) {
    return declare(null, {
        _timeline: null,
        _dialog: null,
        _buttonsHandlers: {},
        _ngwServiceFacade: null,

        CHECK_STATUS_INTERVAL: 5000,

        constructor: function (timeline) {
            this._timeline = timeline;
            this._ngwServiceFacade = new NgwServiceFacade();
            mustache.parse(template);
            mustache.parse(videoItemsTemplate);
            this._bindEvents();
        },

        _bindEvents: function () {
            topic.subscribe('features/manager/filled', lang.hitch(this, function () {
                this._buildFloatingPane();
                this._bindControlsEvents();
                this._updateVideoList();
            }));
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
        },

        _bindControlsEvents: function () {
            this._buttonsHandlers.make = new ButtonClickHandler(
                query('a.icon-plus-circled', this._dialog.domNode)[0],
                lang.hitch(this, function () {
                    this._makeVideo();
                }),
                true
            );

            this._buttonsHandlers.update = new ButtonClickHandler(
                query('a.icon-arrows-cw', this._dialog.domNode)[0],
                lang.hitch(this, function () {
                    this._updateVideoList();
                }),
                true
            );
        },

        _makeVideo: function () {
            var makeVideoItemDialog = new ConfirmDialog({
                title: 'Запись видео',
                id: 'makeVideoItem',
                message: 'Записать новое видео с текущими параметрами проигрывания?',
                buttonOk: 'ОК',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function () {
                    this._toggleMakeButton(false);
                    var recordingVideoParams = this._timeline.getRecordingVideoParams();
                    this._ngwServiceFacade.makeVideo(recordingVideoParams).then(
                        lang.hitch(this, function (videoInfo) {
                            this._updateVideoList();
                            this._startUpdateTimer(videoInfo.id);
                        }),
                        lang.hitch(this, function () {
                            new InfoDialog({
                                isDestroyedAfterHiding: true,
                                title: 'Запись видео',
                                message: 'Записать новое видео не удалось. Попробуйте еще раз.'
                            }).show();
                        })
                    );
                }),
                handlerCancel: lang.hitch(this, function () {
                })
            });

            makeVideoItemDialog.show();
        },

        _startUpdateTimer: function (videoId) {
            var timerId = setInterval(lang.hitch(this, function () {
                this._ngwServiceFacade.getVideoStatus(videoId, {
                    timeout: this.CHECK_STATUS_INTERVAL
                }).then(lang.hitch(this, function (videoInfo) {
                    if (videoInfo.status === 'ready') {
                        clearInterval(timerId);
                        this._updateVideoList();
                        this._toggleMakeButton(true);
                    }
                }));
            }), this.CHECK_STATUS_INTERVAL);
        },

        _toggleMakeButton: function (state) {
            var $makeVideoBtn = $(this._buttonsHandlers.make.getBtnElement());
            if (state) {
                this._buttonsHandlers.make.enable();
                $makeVideoBtn.removeClass('disabled');
                $makeVideoBtn.attr('title', 'Записать видео');
            } else {
                this._buttonsHandlers.make.disable();
                $makeVideoBtn.addClass('disabled');
                $makeVideoBtn.attr('title', 'Запись невозможна - идет создание видео...');
            }
        },

        _updateVideoList: function () {
            var videoListElement = query('div.video-list', this._dialog.domNode)[0],
                templateItems = {
                videoInfoItems: null
            };

            this._ngwServiceFacade.getVideoList().then(lang.hitch(this, function (videoInfoItems) {
                array.forEach(videoInfoItems, function (videoInfo) {
                    videoInfo['status_' + videoInfo.status] = true;
                });
                templateItems.videoInfoItems = videoInfoItems;
                domConstruct.place(mustache.render(videoItemsTemplate, templateItems), videoListElement, "only");
                this._bindVideoListEvents(videoListElement);
            }));
        },

        _bindVideoListEvents: function (videoListElement) {
            var context = this;
            $('a.remove-video-item', videoListElement).on('click', function () {
                var $this = $(this),
                    videoId = $this.data('id'),
                    videoName = $this.data('name');
                context._removeVideoItem(videoId, videoName);
            });
        },

        _removeVideoItem: function (videoId, videoName) {
            var removeVideoItemDialog = new ConfirmDialog({
                title: 'Удалить видео',
                id: 'deleteVideoItem',
                message: 'Удалить видео "' + videoName + '"?',
                buttonOk: 'Удалить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function () {
                    this._ngwServiceFacade.removeVideo(videoId).then(
                        lang.hitch(this, function () {
                            this._updateVideoList();
                        }),
                        lang.hitch(this, function () {
                            new InfoDialog({
                                isDestroyedAfterHiding: true,
                                title: 'Удаление видео',
                                message: 'Удалить видео "' + videoName + '" не удалось. Попробуйте еще раз.'
                            }).show();
                        }));
                }),
                handlerCancel: lang.hitch(this, function () {
                })
            });

            removeVideoItemDialog.show();
        }
    });
});
