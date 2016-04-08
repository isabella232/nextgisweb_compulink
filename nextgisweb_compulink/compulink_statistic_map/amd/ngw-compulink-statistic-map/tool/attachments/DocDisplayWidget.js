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
            if (args.compact === true) { this.title = "Файлы"; }
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-attachment-DocDisplayWidget");

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

            this.title = "Файлы [" + others.length.toString() + "]";

            if (others.length > 0) {

                var tbody = put(this.domNode, "table.pure-table thead tr th.name $ < th.size $ < th.mime_type $ < th.description $ < < < tbody",
                    "Имя", "Размер", "Тип MIME", "Описание");

                array.forEach(others, function (a) {
                    var href = route.feature_attachment.download({
                        id: this.resourceId,
                        fid: this.featureId,
                        aid: a.id
                    });

                    put(tbody, "tr td.name a[href=$] $ < < td.size $ < td.mime_type $ < td.description $",
                        href, a.name, fileSizeToString(a.size), a.mime_type,
                        a.description === null ? "" : a.description);

                }, this);
            }
        }
    });
});
