/*global define, dojox */
define([
    "dojo/_base/declare",
    "ngw-file-upload/Uploader",
    "dojo/Evented"
], function (
    declare,
    Uploader,
    Evented
) {
    return declare([Uploader, Evented], {

        uploadComplete: function (data) {
            this.inherited(arguments);
            this.emit('uploading_finished', data);
        }
    });
});
