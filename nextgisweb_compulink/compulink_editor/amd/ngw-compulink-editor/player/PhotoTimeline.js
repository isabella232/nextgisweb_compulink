define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'ngw/openlayers',
    'ngw-compulink-editor/editor/NgwServiceFacade'
], function (declare, lang, topic, openlayers, NgwServiceFacade) {
    return declare(null, {
        SECONDS_FOR_ONE_PHOTO: 2,
        FADE_EFFECT_TIME: 200,

        $photoTimeline: null,
        _ngwServiceFacade: null,
        _lastPopup: null,
        _featureManager: null,
        _timeline: null,

        constructor: function () {
            this.bindEvents();
            this._ngwServiceFacade = new NgwServiceFacade();
            jQuery('body').append('<div id="photoTimeline"></div>');
            this.$photoTimeline = jQuery('#photoTimeline');
        },

        bindEvents: function () {
            topic.subscribe('compulink/player/timeline/builded', lang.hitch(this, function (timeline) {
                this._timeline = timeline;
                this._featureManager = timeline._featureManager;
            }));
        },

        fillImagesInfo: function () {

        },

        _buildPopup: function (layer, chunkFeatures) {
            var chunkFeaturesCount = chunkFeatures.length,
                feature,
                attachments,
                attachmentPhoto,
                featurePhoto,
                photoUrl,
                popupId,
                geometryPopup,
                popup,
                $popup;

            if (chunkFeaturesCount < 0) {
                return false;
            }

            for (var i = 0; i < chunkFeaturesCount; i++) {
                feature = chunkFeatures[i];
                attachments = chunkFeatures[0].attributes.attachments;
                if (attachments) {
                    array.forEach(attachments, function (attachment) {
                        if (attachment.is_image) {
                            attachmentPhoto = attachments[0];
                            featurePhoto = feature;
                        }
                    });
                    if (attachmentPhoto) break;
                }
            }

            if (!attachmentPhoto || !featurePhoto) return false;

            photoUrl = this._ngwServiceFacade.getAttachmentPhotoUrl(
                featurePhoto.attributes.ngwLayerId,
                featurePhoto.attributes.ngwFeatureId,
                attachmentPhoto.id,
                100, 100
            );

            if (this._lastPopup) {
                var lastPopup = this._lastPopup;
                var displayingTime = Date.now() - lastPopup._displayingTime;
                var timeoutDuration = displayingTime > this.MIN_TIME_POPUP_DISPLAYING ?
                    0 : this.MIN_TIME_POPUP_DISPLAYING - displayingTime;
                setTimeout(lang.hitch(this, function () {
                    lastPopup.$popup.fadeOut(this.FADE_EFFECT_TIME, lang.hitch(this, function () {
                        // console.log(lastPopup.id + ': destroyed');
                        lastPopup.destroy();
                    }));
                }), timeoutDuration);
            }

            popupId = featurePhoto.attributes.ngwFeatureId + '-' + featurePhoto.attributes.ngwLayerId;
            geometryPopup = chunkFeatures[0].geometry.getCentroid();
            popup = new openlayers.Popup(
                popupId,
                new openlayers.LonLat(geometryPopup.x, geometryPopup.y),
                new openlayers.Size(100, 100),
                popupId,
                true);
            popup.contentHTML = '<img src="' + photoUrl + '" />';
            popup.$popup = jQuery(popup.div);
            popup.$popup.addClass('createdPopup');
            layer.map.addPopup(popup);
            this._lastPopup = popup;
            // console.log(popup.id + ': created');
            popup.$popup.fadeIn(this.FADE_EFFECT_TIME, lang.hitch(this, function () {
                popup._displayingTime = Date.now();
                // console.log(popup.id + ': displaying');
            }));
        }
    });
});
