define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojo/on",
    "dojox/image/Lightbox",
    "put-selector/put",
    "ngw/route",
    "ngw-feature-layer/DisplayWidget",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + "dojox/image/resources/Lightbox.css",
    "xstyle/css!./resource/DisplayWidget.css"
], function (
    declare,
    array,
    domClass,
    on,
    Lightbox,
    put,
    route,
    DisplayWidget
) {
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
            if (args.compact === true) { this.title = "Фото"; }
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
                if (i.is_image) { images.push(i); }
                else { others.push(i); }
            });

            this.title = "Фото [" + images.length.toString() + "]";

            if (images.length > 0) {
                array.forEach(images, function (image) {
                    var href = route.feature_attachment.download({
                        id: this.resourceId,
                        fid: this.featureId,
                        aid: image.id
                    });

                    var src = route.feature_attachment.image({
                        id: this.resourceId,
                        fid: this.featureId,
                        aid: image.id
                    }) + (this.compact ? "?size=64x64" : "?size=128x128");

                    var a = put(this.domNode, "a.image[href=$] img[src=$] <", href, src);

                    var lbox = this.lbox;
                    lbox.addImage({href: href, title: image.description || image.name}, "main");

                    on(a, "click", function (evt) {
                        lbox.show({group: "main", href: href, title: image.description || image.name});
                        evt.preventDefault();
                    });
                }, this);
            }
        }
    });
});
