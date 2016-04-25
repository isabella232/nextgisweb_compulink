define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/on",
    "dojo/html",
    "dojo/aspect",
    "dojo/request/xhr",
    "dojox/image/Lightbox",
    "dojox/form/Uploader",
    "dojox/dtl",
    "dojox/dtl/Context",
    "dojox/dtl/_base",
    "put-selector/put",
    "ngw/route",
    "ngw-feature-layer/DisplayWidget",
    "dojo/text!./resource/FotoDisplayWidget.html",
    "dojo/text!./resource/FotoDisplayWidgetItem.html",
    "dojo/NodeList-traverse",
    "xstyle/css!" + ngwConfig.amdUrl + "dojox/image/resources/Lightbox.css",
    "xstyle/css!./resource/DisplayWidget.css"
], function (declare,
             array,
             lang,
             domClass,
             domConstruct,
             query,
             on,
             html,
             aspect,
             xhr,
             Lightbox,
             Uploader,
             dtl,
             dtlContext,
             dtlBase,
             put,
             route,
             DisplayWidget,
             template,
             templateItem) {
    function fileSizeToString(size) {
        var units = ["B", "KB", "MB", "GB"],
            i = 0;
        while (size >= 1024) {
            size /= 1024;
            ++i;
        }
        return size.toFixed(1) + " " + units[i];
    }

    return declare([DisplayWidget], {
        title: "Прикрепленные файлы",

        constructor: function (args) {
            if (args.compact === true) {
                this.title = "Фото";
            }

            aspect.after(this, "placeAt", lang.hitch(this, function (deferred) {
                var uploader = new Uploader({
                    label: "Загрузить",
                    iconClass: "dijitIconNewTask",
                    multiple: true,
                    uploadOnSelect: true,
                    url: ngwConfig.applicationUrl + "/api/component/file_upload/upload",
                    name: 'file'
                }).placeAt(query("div.panel", this.domNode)[0]);

                uploader.on("complete", lang.hitch(this, function (data) {
                    array.forEach(data.upload_meta, function (f) {
                        var putUrlTmpl = new dtlBase.Template("/api/resource/{{id}}/feature/{{fid}}/attachment/", true),
                            putUrlContext = new dtlBase.Context({
                                id: this.resourceId,
                                fid: this.featureId,
                                aid: f.id
                            }),
                            putUrl = putUrlTmpl.render(putUrlContext);

                        xhr(ngwConfig.applicationUrl + putUrl, {
                            handleAs: "json",
                            method: "POST",
                            data: JSON.stringify({
                                file_upload: {
                                    id: f.id,
                                    size: f.size
                                },
                                mime_type: f.mime_type,
                                name: f.name,
                                size: f.size
                            })
                        }).then(lang.hitch(this, function (data) {
                            this.renderImage(this.resourceId, this.featureId, {
                                id: data.id,
                                mime_type: f.mime_type,
                                name: f.name,
                                size: f.size
                            });
                            this.updateTitle();
                        }));
                    }, this);
                }));
            }));
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-attachment-FotoDisplayWidget");

            this.lbox = new dojox.image.LightboxDialog({});
        },

        startup: function () {
            this.inherited(arguments);
            this.lbox.startup();
        },

        renderValue: function (value) {
            var images = [], others = [];
            array.forEach(value, function (i) {
                if (i.is_image) {
                    images.push(i);
                }
                else {
                    others.push(i);
                }
            });

            var tmplWrapper = new dtlBase.Template(template);
            domConstruct.place(tmplWrapper.render(), this.domNode, "last");

            if (images.length > 0) {
                array.forEach(images, function (image) {
                    this.renderImage(this.resourceId, this.featureId, image);
                }, this);
            }

            this.title = 'Фото &#91;<span id="photoCount">' + query('div.image', this.domNode).length + '</span>&#93;';
        },

        updateTitle: function () {
            html.set(document.getElementById('photoCount'), query('div.image', this.domNode).length.toString());
        },

        renderImage: function (resourceId, fid, image) {
            var aid = image.id;

            var href = route.feature_attachment.download({
                id: resourceId,
                fid: fid,
                aid: aid
            });

            var src = route.feature_attachment.image({
                    id: resourceId,
                    fid: fid,
                    aid: aid
                }) + (this.compact ? "?size=64x64" : "?size=128x128");

            var tmpl = new dtl.Template(templateItem);
            var context = new dtlContext({
                title: image.name,
                url: src
            });
            var imageElement = domConstruct.place(tmpl.render(context),
                query("div.photo-content", this.domNode)[0],
                "last");

            var lbox = this.lbox;
            lbox.addImage({href: href, title: image.description || image.name}, "main");

            on(query("div.imgWrapper", imageElement), "click", function (evt) {
                lbox.show({group: "main", href: href, title: image.description || image.name});
                evt.preventDefault();
            });

            on(query("div.remove", imageElement), "click", lang.hitch(this, function (evt) {
                var removeUrlTmpl = new dtlBase.Template("/api/resource/{{id}}/feature/{{fid}}/attachment/{{aid}}", true),
                    removeUrlContext = new dtlBase.Context({
                        id: resourceId,
                        fid: fid,
                        aid: aid
                    }),
                    removeUrl = removeUrlTmpl.render(removeUrlContext),
                    imageElement = evt.target.parentElement;

                xhr(ngwConfig.applicationUrl + removeUrl, {
                    handleAs: "json",
                    method: "DELETE"
                }).then(lang.hitch(this, function (data) {
                    domConstruct.destroy(imageElement);
                    this.updateTitle();
                }));

                evt.preventDefault();
            }));
        }
    });
});
