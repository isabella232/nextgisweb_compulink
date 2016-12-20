define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'ngw/openlayers',
    'ngw-compulink-editor/editor/NgwServiceFacade'
], function (declare, lang, array,
             topic, openlayers, NgwServiceFacade) {
    return declare(null, {
        SECONDS_FOR_ONE_PHOTO: 2,
        FADE_EFFECT_TIME: 1000,
        PHOTO_WIDTH: 100,
        PHOTO_HEIGHT: 100,

        $photoTimeline: null,
        _ngwServiceFacade: null,
        _lastPopup: null,
        _featureManager: null,
        _timeline: null,
        _intervals: null,
        _turned: true,

        constructor: function () {
            this.bindEvents();
            this._ngwServiceFacade = new NgwServiceFacade();
            jQuery('body').append('<div id="photoTimeline"></div>');
            this.$photoTimeline = jQuery('#photoTimeline');
        },

        bindEvents: function () {
            topic.subscribe('compulink/player/features/builded', lang.hitch(this, function (from, to) {
                if (!this._turned) return false;
                this._renderPopup(from, to);
            }));

            topic.subscribe('compulink/player/controls/speed/changed', lang.hitch(this, function () {
                this.fillImages();
            }));

            topic.subscribe('compulink/player/photo-timeline/toggle', lang.hitch(this, function (turned) {
                this._turned = turned;
                if (this._turned) {
                    this._renderPopup(null, this._timeline.getCurrentTime());
                } else {
                    this._hideLastPopup();
                }
            }));
        },

        init: function (timeline) {
            this._timeline = timeline;
            this._featureManager = timeline.getFeatureManager();
            this.fillImages();
        },

        _renderPopup: function (from, to) {
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

        _getInterval: function (to) {
            var intervals = this._intervals,
                toMs = to.getTime(),
                targetInterval,
                currentInterval;

            for (var i = 0; i < intervals.count; i++) {
                currentInterval = intervals[i];

                if (i === 0 && toMs >= currentInterval.fromMs && toMs <= currentInterval.toMs) {
                    targetInterval = currentInterval;
                    break;
                }

                if (i > 0 && toMs > currentInterval.fromMs && toMs <= currentInterval.toMs) {
                    targetInterval = currentInterval;
                    break;
                }
            }

            if (!targetInterval) {
                throw 'PhotoTimeline: target interval not found!';
            }

            return currentInterval;
        },

        fillImages: function () {
            var intervalsTicks = this._fillImagesInfo(),
                analyzedIntervals = this._analyzeIntervals(intervalsTicks);

            this._intervals = null;

            this.$photoTimeline.empty();

            array.forEach(analyzedIntervals, lang.hitch(this, function (interval) {
                var $img = jQuery('<img src="' + interval.photoInfo.photoUrl + '"/>');

                $img.load(function () {
                    $img.attr('data-w', $img.width());
                    $img.attr('data-h', $img.height());
                });

                this.$photoTimeline.append($img);
                interval.$img = $img;
            }));

            this._intervals = analyzedIntervals;
            this._intervals.count = analyzedIntervals.length;
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
        }
    });
});
