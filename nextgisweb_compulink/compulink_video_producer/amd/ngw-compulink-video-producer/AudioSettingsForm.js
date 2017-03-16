/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "dojo/text!./template/AudioSettingsForm.hbs",
    "dojo/_base/lang",
    "dijit/registry",
    "dojo/dom",
    "dojox/widget/Toaster",
    // template
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "./AudioFileUploader",
    "dijit/form/Select",
    "dojox/layout/TableContainer",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/widget/Toaster/Toaster.css'
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    xhr,
    json,
    route,
    template,
    lang,
    registry,
    dom,
    Toaster
) {
    var API_LIST_URL = route.compulink_video_admin.settings_audio_list();
    var API_ADD_URL = route.compulink_video_admin.settings_audio_add();

    var API_ACTIVE_URL = route.compulink_video_admin.settings_audio_active();


    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        setActiveValue: function(val) {
            this.active = val;
        },

        postCreate: function () {
            this.inherited(arguments);
            var widget = this;
            this.buttonSave.on("click", function () {
                widget.save();
            });
        },

        startup: function () {
            this.inherited(arguments);
            var widget = this;
            xhr.get(API_LIST_URL, {
                handleAs: 'json'
            }).then(function (data) {
                widget.wFileList.addOption(data['audio_files']);

                xhr.get(API_ACTIVE_URL , {
                   handleAs: 'json'
                }).then(function(data) {
                    widget.wFileList.set("value", data.active);
                });
            });
            this.wAddFile.on('uploading_finished', lang.hitch(this, this.file_uploaded));

            this.toaster = new Toaster({positionDirection: 'bl-right'}, '#main_toaster');
        },

        file_uploaded: function(data) {
            var widget = this;
            xhr.post(API_ADD_URL, {
                handleAs: 'json',
                data: json.stringify(data.upload_meta[0])
            }).then(function (data) {
                widget.wFileList.addOption(data);
                widget.wFileList.set('value', data.value);
            });
        },

        save: function () {
            xhr.post(API_ACTIVE_URL, {
                handleAs: 'json',
                headers: {
                    "Content-Type": "application/json"
                },
                data: json.stringify({
                    active: this.wFileList.get('value')
                })
            }).then(
                lang.hitch(this, function () {
                    //window.location.reload(true);
                    this.toaster.setContent('Сохранение успешно', 'message', duration=3000);
                    this.toaster.show();
                }),
                lang.hitch(this, function () {
                    this.toaster.setContent('Ошибка при сохранении', 'error', duration=3000);
                    this.toaster.show();
                })
            );
        }
    });
});