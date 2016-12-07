define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'ngw/openlayers',
    'ngw-compulink-editor/editor/NgwServiceFacade'
], function (declare, lang, array, topic, openlayers, NgwServiceFacade) {
    return declare(null, {
        SECONDS_FOR_ONE_PHOTO: 2,
        FADE_EFFECT_TIME: 200,
        PHOTO_WIDTH: 100,
        PHOTO_HEIGHT: 100,

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
                this._featureManager = timeline.getFeatureManager();
                this.fillImages();
            }));
        },

        fillImages: function () {
            var intervalsTicks = this._fillImagesInfo(),
                analyzedIntervals = this._analyzeIntervals(intervalsTicks),
                img;

            this.$photoTimeline.empty();

            array.forEach(analyzedIntervals, lang.hitch(this, function (interval) {
                img = jQuery('<img src="' + interval.photoInfo.photoUrl + '"/>');
                this.$photoTimeline.append(img);
                interval.$img = img;
            }));
        },

        _analyzeIntervals: function (intervalsTicks) {
            var analyzedIntervals = [],
                analyzedIntervalCount = 0,
                currentAnalyzedInterval,
                photoInfo;
            array.forEach(intervalsTicks, lang.hitch(this, function (interval, i) {
                if (i === 0) {
                    analyzedIntervals.push(interval);
                    analyzedIntervalCount = 1;
                    return true;
                }

                photoInfo = interval.photoInfo;
                if (photoInfo) {
                    analyzedIntervals.push(interval);
                    analyzedIntervalCount++;
                } else {
                    currentAnalyzedInterval = analyzedIntervals[analyzedIntervalCount - 1];
                    currentAnalyzedInterval.to = interval.to;
                    currentAnalyzedInterval.toMs = interval.toMs;
                    currentAnalyzedInterval.tickTo = interval.tickTo;
                }
            }));

            return analyzedIntervals;
        },

        _fillImagesInfo: function () {
            var intervalsTicks = this._getIntervalsTicks(),
                featuresByBuiltDate = this._featureManager._featuresByBuiltDate,
                featureIndex = 0,
                isNextFeatureIsInterval,
                featuresCount,
                currentInterval,
                feature,
                nextFeature,
                photoInfo;

            featuresCount = featuresByBuiltDate.length;

            for (var i = 0; i < intervalsTicks.count; i++) {
                if (featureIndex === featuresCount) {
                    break;
                }

                currentInterval = intervalsTicks[i];

                isNextFeatureIsInterval = i === 0 ?
                    this._isFeatureIntoInterval(intervalsTicks, i, featuresByBuiltDate[featureIndex]) :
                    this._isFeatureIntoInterval(intervalsTicks, i, featuresByBuiltDate[featureIndex + 1]);

                if (!isNextFeatureIsInterval) {
                    continue;
                }

                for (; featureIndex < featuresCount; featureIndex++) {
                    feature = featuresByBuiltDate[featureIndex];

                    if (!currentInterval.photoInfo) {
                        photoInfo = this._getPhotoInfo(feature);
                        if (photoInfo) currentInterval.photoInfo = photoInfo;
                    }

                    if (featuresCount === featureIndex + 1) break;

                    nextFeature = featuresByBuiltDate[featureIndex + 1];
                    if (!this._isFeatureIntoInterval(intervalsTicks, i, nextFeature)) {
                        break;
                    }
                }
            }

            return intervalsTicks;
        },

        _isFeatureIntoInterval: function (intervalsInfo, indexInterval, feature) {
            var currentInterval = intervalsInfo[indexInterval];

            if (indexInterval === intervalsInfo.count - 1) {
                return feature.attributes.built_date_ms >= currentInterval.fromMs &&
                    feature.attributes.built_date_ms <= currentInterval.toMs;
            } else {
                return feature.attributes.built_date_ms >= currentInterval.fromMs &&
                    feature.attributes.built_date_ms < currentInterval.toMs;
            }
        }
        ,

        _getIntervalsTicks: function () {
            var minBuiltDate = this._featureManager.minBuiltDate,
                maxBuiltDate = this._featureManager.maxBuiltDate,
                maxBuiltDateMs = maxBuiltDate.getTime(),
                unitsInfo = this._timeline.getUnitsInfo(),
                intervals = [],
                currentCountIntervals = 0,
                to = 0,
                tickFrom = 0;

            while (to < maxBuiltDateMs) {
                intervals.push(this._timeline._getIntervalTimeByTickFrom(
                    minBuiltDate,
                    tickFrom,
                    unitsInfo.units,
                    unitsInfo.unitsPerSec,
                    2
                ));

                currentCountIntervals++;
                to = intervals[currentCountIntervals - 1].to.getTime();
                tickFrom = intervals[currentCountIntervals - 1].tickTo;
            }

            intervals.count = intervals.length;
            intervals.push = null;

            return intervals;
        },

        _getPhotoInfo: function (feature) {
            var attachments = feature.attributes.attachments,
                attachmentPhoto,
                featurePhoto,
                photoUrl;
            if (!attachments) return null;

            array.forEach(attachments, function (attachment) {
                if (attachment.is_image) {
                    attachmentPhoto = attachments[0];
                    featurePhoto = feature;
                }
            });

            if (!attachmentPhoto || !featurePhoto) return null;

            photoUrl = this._ngwServiceFacade.getAttachmentPhotoUrl(
                featurePhoto.attributes.ngwLayerId,
                featurePhoto.attributes.ngwFeatureId,
                attachmentPhoto.id,
                this.PHOTO_WIDTH, this.PHOTO_HEIGHT
            );

            return {
                photoUrl: photoUrl,
                feature: featurePhoto,
                featureId: featurePhoto.attributes.ngwFeatureId,
                layerId: featurePhoto.attributes.ngwLayerId
            }
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
