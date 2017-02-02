define([
    'dojo/_base/lang',
    'ngw/openlayers',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./PointerControl.mustache',
    './Strategies/MaximumMeasureStrategy',
    'xstyle/css!./PointerControl.css'
], function (lang, openlayers, mustache, template, DefaultPhotoOrderStrategy) {
    return openlayers.Class(openlayers.Control, {
        CLASS_NAME: 'OpenLayers.Control.PhotoPointer',
        template: mustache.parse(template),
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
            div.innerHTML = mustache.render(template, this);
            return div;
        },


        _$lastImg: null,

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

            this.makePointerLine(photoInfo.feature.geometry, [this.PHOTO_WIDTH, this.PHOTO_HEIGHT]);

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

        /**
         * Cached sizes of Photo container
         */
        _sizeInfo: null,

        /**
         * Create and draw pointer line
         * @param {OpenLayers.Geometry} targetGeometry - Feature associated with photo.
         * @param {Array.<number>} sizeInfo - Size of photo container in format [width, height].
         */
        makePointerLine: function (targetGeometry, sizeInfo) {

            // TODO Implement logic for #544
            return true;

            var map = this._pointerLayer.map,
                startPoint,
                linePointer, featurePointer,
                centroidGeometry;

            this._pointerLayer.destroyFeatures();

            centroidGeometry = targetGeometry.getCentroid();
            startPoint = this._getStartPoint(map, sizeInfo);

            linePointer = new openlayers.Geometry.LineString([startPoint, centroidGeometry]);
            featurePointer = new openlayers.Feature.Vector(linePointer, {}, this._style);

            this._sizeInfo = sizeInfo;

            this._pointerLayer.addFeatures(featurePointer);
        },

        /**
         * Make start point for pointer line
         * @param {OpenLayers.Map} map - Current instance of the map associated with _pointerLayer.
         * @param {Array.<number>} sizeInfo - Size of photo container in format [width, height].
         * @returns {OpenLayers.Geometry.Point} Start point for pointer line
         */
        _getStartPoint: function (map, sizeInfo) {
            var startPixel, startLonLat, startPoint;

            if (!sizeInfo && this._sizeInfo) {
                sizeInfo = this._sizeInfo;
            }

            startPixel = this._getStartPixel(map, sizeInfo, false);
            startLonLat = map.getLonLatFromPixel(startPixel);
            startPoint = new openlayers.Geometry.Point(startLonLat.lon, startLonLat.lat);

            return startPoint;
        },

        /**
         * Cached pixel position of start point
         * Cached value will be cleared if view port of the map will be changed
         */
        _startPixel: null,

        /**
         * Calculate pixel position of start point for pointer line
         * @param {OpenLayers.Map} map - Current instance of the map associated with _pointerLayer.
         * @param {Array.<number>} sizeInfo - Size of photo container in format [width, height].
         * @param {boolean} force - Recalculating start pixel without cached value stored in _startPixel.
         * @returns {OpenLayers.Pixel} Pixel position of start point for pointer line
         */
        _getStartPixel: function (map, sizeInfo, force) {
            var $viewPortDiv,
                height;

            if (this._startPixel && !force) {
                return this._startPixel;
            }

            $viewPortDiv = $(map.viewPortDiv);
            height = $viewPortDiv.height();

            this._startPixel = new openlayers.Pixel(sizeInfo[0] / 2, height - sizeInfo[1] / 2);

            return this._startPixel;
        },

        _moveHandle: function (event) {
            var map, pointerLayer, pointerLine, startPoint;

            pointerLayer = this._pointerLayer;
            pointerLine = this._pointerLayer.features[0];

            if (pointerLine) {
                map = event.object;
                startPoint = this._getStartPoint(map, null);
                pointerLine.geometry.components[0] = startPoint;
                pointerLayer.drawFeature(pointerLine);
            }
        },

        _activateLayer: function () {
            this.map.addLayer(this._getLayer());
            this.map.events.register('move', this, this._moveHandle);
        },

        _deactivateLayer: function () {
            this.map.events.unregister('move', this, this._moveHandle);
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
            layer._ap_zindex = 10000;
            layer.setZIndex(10000);

            return layer;
        }
    });
});
