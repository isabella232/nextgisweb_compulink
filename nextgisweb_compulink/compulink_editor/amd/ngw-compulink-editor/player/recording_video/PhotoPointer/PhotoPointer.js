define([
    'dojo/_base/declare',
    'ngw-compulink-editor/player/PhotoTimeline/PhotoPointer/PhotoPointer',
    'ngw-compulink-editor/player/PhotoTimeline/PhotoPointer/ol-controls/PointerControl',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./PointerControl.mustache',
    'xstyle/css!./PointerControl.css'
], function (declare, PhotoPointer, PointerControl, mustache, template) {
    return declare([PhotoPointer], {
        _makeOlControl: function () {
            this._olControl = new PointerControl({
                width: this.PHOTO_WIDTH,
                height: this.PHOTO_HEIGHT,
                template: template
            });
        }
    });
});
