define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'ngw/openlayers',
    './BasePhotoTimeline'
], function (declare, lang, array,
             topic, openlayers, BasePhotoTimeline) {
    return declare([BasePhotoTimeline], {
        _lastPopup: null,
        _imagesContainerId: 'photoLayerImgs',

        _renderPhoto: function (from, to) {
            var interval = this._getInterval(to),
                photoInfo = interval.photoInfo,
                layer = this._featureManager.getLayer(),
                $img, popupId, popupSize, geometry, popup;

            popupId = photoInfo.featureId + '-' + photoInfo.layerId;

            if (this._lastPopup && this._lastPopup.id === popupId) {
                return true;
            }

            this._hideLastPopup();

            geometry = photoInfo.feature.geometry.getCentroid();

            $img = interval.$img;
            popupSize = new openlayers.Size(
                $img.attr('data-w') || this.PHOTO_WIDTH,
                $img.attr('data-h') || this.PHOTO_HEIGHT);

            popup = new openlayers.Popup(
                popupId,
                new openlayers.LonLat(geometry.x, geometry.y),
                popupSize,
                popupId,
                true);

            popup.contentHTML = jQuery('<div />').append(interval.$img.clone()).html();
            popup.$popup = jQuery(popup.div);
            popup.$popup.addClass('createdPopup');
            layer.map.addPopup(popup);
            this._lastPopup = popup;
            popup.$popup.fadeIn(this.FADE_EFFECT_TIME, lang.hitch(this, function () {
                popup._displayingTime = Date.now();
            }));
        },

        _hideLastPopup: function () {
            var popupId,
                popups,
                targetPopup;

            if (!this._lastPopup) {
                return true;
            }

            popupId = this._lastPopup.id;
            popups = this._featureManager.getLayer().map.popups;

            this._lastPopup.$popup.fadeOut(this.FADE_EFFECT_TIME, lang.hitch(this, function () {
                array.forEach(popups, function (popup) {
                    if (popup.id === popupId) {
                        targetPopup = popup;
                    }
                });
                if (targetPopup) targetPopup.destroy();
            }));
        },

        toggle: function (state) {
            this._turned = state;
            if (this._turned) {
                this._renderPhoto(null, this._timeline.getCurrentTime());
            } else {
                this._hideLastPopup();
            }
        }
    });
});
