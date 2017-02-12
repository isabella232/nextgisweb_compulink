define([
    'dojo/_base/lang',
    'dojo/_base/array',
    'ngw/openlayers',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./PointerControl.mustache',
    './Strategies/RandomStrategy',
    'xstyle/css!./PointerControl.css'
], function (lang, array, openlayers, mustache, template, DefaultPhotoOrderStrategy) {
    return openlayers.Class(openlayers.Control, {
        CLASS_NAME: 'OpenLayers.Control.PhotoPointer',
        template: template,
        photoOrderStrategy: null,
        _pointerLayer: null,
        _imageContainers: null,

        _style: {
            strokeColor: '#2175C3',
            strokeOpacity: 0.8,
            strokeWidth: 2,
            strokeDashstyle: 'longdash'
        },

        $div: null,

        initialize: function (options) {
            openlayers.Control.prototype.initialize.apply(this, [options]);

            if (options.orderStrategy) {
                this.photoOrderStrategy = new options.orderStrategy(this);
            } else {
                this.photoOrderStrategy = new DefaultPhotoOrderStrategy(this);
            }
        },

        activate: function () {
            openlayers.Control.prototype.activate.apply(this);

            if (!this.$div) {
                this.$div = $(this.div);
            }

            this._activateLayer();
            this._makeImageContainers();
        },

        deactivate: function () {
            openlayers.Control.prototype.deactivate.apply(this);
            this._deactivateLayer();
        },

        draw: function () {
            var div = openlayers.Control.prototype.draw.apply(this);
            div.innerHTML = mustache.render(this.template, this);
            return div;
        },


        _$lastImg: null,
        _lastImageContainer: null,

        renderPhoto: function (intervalInfo) {
            var photoInfo = intervalInfo.photoInfo,
                $imgCloned,
                $img, imageId,
                imageContainer,
                $imageWrapper;

            imageId = photoInfo.featureId + '-' + photoInfo.layerId;
            if (this._$lastImg && this._$lastImg.attr('data-id') === imageId) {
                return true;
            }

            $img = intervalInfo.$img;
            $imgCloned = $img.clone();
            $imgCloned.attr('data-id', imageId);
            $imgCloned.hide();

            if (this._$lastImg) {
                this._$lastImg.fadeOut(this.FADE_EFFECT_TIME, function () {
                    $(this).remove();
                });
            }

            imageContainer = this.photoOrderStrategy.getImageContainer(photoInfo);
            $imageWrapper = imageContainer.$wrapper;

            this._$lastImg = $imgCloned.appendTo($imageWrapper);
            this._lastImageContainer = imageContainer;

            this.makePointerLine(photoInfo, imageContainer);

            this._$lastImg.fadeIn(this.FADE_EFFECT_TIME, lang.hitch(this, function () {

            }));
        },

        _makeImageContainers: function () {
            var $imageWrappers = this.$div.find('div.image-wrapper'),
                imageContainers = [],
                imageContainer;

            $imageWrappers.each(lang.hitch(this, function (i, imageWrapper) {
                imageContainer = {
                    $wrapper: $(imageWrapper),
                    position: {
                        pixel: null,
                        point: null
                    }
                };
                this._calculatePixelPosition(imageContainer);
                this._calculateLatlonPosition(imageContainer);
                imageContainers.push(imageContainer);
            }));

            this._imageContainers = imageContainers;
        },

        _updateImageContainersLatlon: function () {
            array.forEach(this._imageContainers, function (imageContainer) {
                this._calculateLatlonPosition(imageContainer);
            }, this);
        },

        _calculatePixelPosition: function (imageContainer) {
            imageContainer.position.pixel = new openlayers.Pixel(
                imageContainer.$wrapper.offset().left - this.$div.offset().left + this.width / 2,
                imageContainer.$wrapper.offset().top - this.$div.offset().top + this.height / 2
            );
        },

        _calculateLatlonPosition: function (imageContainer) {
            var latlon;

            if (!this.map) {
                return false;
            }

            latlon = this.map.getLonLatFromPixel(imageContainer.position.pixel);
            imageContainer.position.point = new openlayers.Geometry.Point(latlon.lon, latlon.lat);
        },

        makePointerLine: function (photoInfo, imageContainer) {
            var linePointer, featurePointer;

            this._pointerLayer.destroyFeatures();

            linePointer = new openlayers.Geometry.LineString([imageContainer.position.point, photoInfo.geometry]);
            featurePointer = new openlayers.Feature.Vector(linePointer, {}, this._style);

            this._pointerLayer.addFeatures(featurePointer);
        },

        _moveHandle: function (event) {
            var pointerLayer, pointerLine;

            pointerLayer = this._pointerLayer;
            pointerLine = this._pointerLayer.features[0];

            if (pointerLine) {
                this._calculateLatlonPosition(this._lastImageContainer);
                pointerLine.geometry.components[0] = this._lastImageContainer.position.point;
                pointerLayer.drawFeature(pointerLine);
            }
        },

        _moveEndHandle: function () {
            this._updateImageContainersLatlon();
        },

        _activateLayer: function () {
            this.map.addLayer(this._getLayer());
            this.map.events.register('move', this, this._moveHandle);
            this.map.events.register('moveend', this, this._moveEndHandle);
        },

        _deactivateLayer: function () {
            this.map.events.unregister('move', this, this._moveHandle);
            this.map.events.register('moveend', this, this._moveEndHandle);
            this.map.removeLayer(this._getLayer());
        },

        _getLayer: function () {
            if (!this._pointerLayer) {
                this._pointerLayer = this._makeLayer();
            }
            return this._pointerLayer;
        },

        _makeLayer: function () {
            var layer;

            layer = new openlayers.Layer.Vector(this.id);
            layer.cl_zIndex = 10000;

            return layer;
        }
    });
});
