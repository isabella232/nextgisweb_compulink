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
        _pointerLayers: null,
        _lastLayerIndex: null,
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
                $lastImg,
                imageContainer,
                $imageWrapper,
                lastLayer = this._lastLayerIndex === null ? null : this._pointerLayers[this._lastLayerIndex],
                newLayer;

            imageId = photoInfo.featureId + '-' + photoInfo.layerId;
            if (lastLayer && lastLayer.cl_$lastImage && lastLayer.cl_$lastImage.attr('data-id') === imageId) {
                return true;
            }

            $img = intervalInfo.$img;
            $imgCloned = $img.clone();
            $imgCloned.attr('data-id', imageId);
            $imgCloned.hide();

            if (lastLayer) {
                lastLayer.cl_$lastImage.fadeOut({
                    duration: this.FADE_EFFECT_TIME,
                    step: lang.hitch(this, function (now) {
                        lastLayer.setOpacity(now);
                    }),
                    complete: function () {
                        lastLayer.cl_$lastImage.remove();
                    }
                });
            }

            imageContainer = this.photoOrderStrategy.getImageContainer(photoInfo);
            $imageWrapper = imageContainer.$wrapper;

            $lastImg = $imgCloned.appendTo($imageWrapper);

            newLayer = this.makePointerLine(photoInfo, imageContainer);
            newLayer.cl_$lastImage = $lastImg;
            newLayer.cl_imageContainer = imageContainer;

            newLayer.cl_$lastImage.fadeIn({
                duration: this.FADE_EFFECT_TIME,
                step: lang.hitch(this, function (now) {
                    newLayer.setOpacity(now);
                })
            });
            newLayer.cl_$lastImage.addClass('scale-animated');
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
            var newLayer,
                linePointer, featurePointer;

            if (this._lastLayerIndex === null) {
                this._lastLayerIndex = 0;
            } else {
                this._lastLayerIndex = this._lastLayerIndex === 0 ? 1 : 0;
            }

            newLayer = this._pointerLayers[this._lastLayerIndex];
            newLayer.setOpacity(0);
            newLayer.destroyFeatures();

            linePointer = new openlayers.Geometry.LineString([imageContainer.position.point, photoInfo.geometry]);
            featurePointer = new openlayers.Feature.Vector(linePointer, {}, this._style);

            newLayer.addFeatures(featurePointer);
            return newLayer;
        },

        _moveHandle: function (event) {
            this._rebuildPointerLine(this._pointerLayers[0], this._pointerLayers[0].features[0]);
            this._rebuildPointerLine(this._pointerLayers[1], this._pointerLayers[1].features[0]);
        },

        _rebuildPointerLine: function (pointerLayer, pointerLine) {
            if (pointerLine) {
                this._calculateLatlonPosition(pointerLayer.cl_imageContainer);
                pointerLine.geometry.components[0] = pointerLayer.cl_imageContainer.position.point;
                pointerLayer.drawFeature(pointerLine);
            }
        },

        _moveEndHandle: function () {
            this._updateImageContainersLatlon();
        },

        _activateLayer: function () {
            var layers = this._addLayers();
            this._initLayersImageContainers(layers);
            this.map.events.register('move', this, this._moveHandle);
            this.map.events.register('moveend', this, this._moveEndHandle);
        },

        _deactivateLayer: function () {
            this.map.events.unregister('move', this, this._moveHandle);
            this.map.events.register('moveend', this, this._moveEndHandle);
            this._removeLayers();
        },
        
        _addLayers: function () {
            var layers = this._getLayers();
            array.forEach(layers, lang.hitch(this, function (layer) {
                this.map.addLayer(layer);
            }));
            return layers;
        },
        
        _removeLayers: function () {
            var layers = this._getLayers();
            array.forEach(layers, lang.hitch(this, function (layer) {
                this.map.removeLayer(layer);
            }));
        },

        _getLayers: function () {
            if (!this._pointerLayers) {
                this._pointerLayers = this._makeLayers();
            }
            return this._pointerLayers;
        },

        _makeLayers: function () {
            var layers = [],
                layer;

            layer = new openlayers.Layer.Vector(this.id + '_0');
            layer.cl_zIndex = 10000;
            layers.push(layer);
            
            layer = new openlayers.Layer.Vector(this.id + '_1');
            layer.cl_zIndex = 10001;
            layers.push(layer);

            return layers;
        },

        _initLayersImageContainers: function (layers) {
            array.forEach(layers, lang.hitch(this, function (layer) {
                layer.cl_imageContainer = null;
                layer.cl_$lastImage = null;
            }));
        }
    });
});
