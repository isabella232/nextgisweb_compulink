define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'ngw/openlayers',
    '../BasePhotoTimeline',
    './ol-controls/PointerControl'
], function (declare, lang, array, topic, openlayers, BasePhotoTimeline, PointerControl) {
    return declare([BasePhotoTimeline], {
        _imagesContainerId: 'photoPointerImgs',
        _olControl: null,
        _$imgWrapper: null,
        _$lastImg: null,

        constructor: function () {
            this._makeOlControl();
        },

        _makeOlControl: function () {
            this._olControl = new PointerControl({
                width: this.PHOTO_WIDTH,
                height: this.PHOTO_HEIGHT
            });
        },

        init: function (timeline) {
            this.inherited(arguments);
            this._featureManager.getLayer().map.addControl(this._olControl);
            this._olControl.activate();
            this._$imgWrapper = $(this._olControl.div).find('div.image-wrapper');
        },

        _renderPhoto: function (from, to) {
            var intervalInfo = this._getIntervalInfo(to),
                photoInfo = intervalInfo.photoInfo,
                $imgCloned,
                $img, imageId;

            imageId = photoInfo.featureId + '-' + photoInfo.layerId;
            if (this._$lastImg && this._$lastImg.attr('data-id') === imageId) {
                return true;
            }

            this._olControl.makePointerLine(photoInfo.feature.geometry, [this.PHOTO_WIDTH, this.PHOTO_HEIGHT]);

            $img = intervalInfo.$img;
            $imgCloned = $img.clone();
            $imgCloned.attr('data-id', imageId);
            $imgCloned.hide();

            if (this._$lastImg) {
                this._$lastImg.fadeOut(this.FADE_EFFECT_TIME, function () {
                    $(this).remove();
                });
            }
            this._$lastImg = $imgCloned.appendTo(this._$imgWrapper);
            this._$lastImg.fadeIn(this.FADE_EFFECT_TIME, lang.hitch(this, function () {

            }));
        },

        toggle: function (state) {
            if (state === this._turned) return false;

            this._turned = state;
            if (this._turned) {
                this._olControl.activate();
                this._renderPhoto(null, this._timeline.getCurrentTime());
            } else {
                this._olControl.deactivate();
            }
        }
    });
});
