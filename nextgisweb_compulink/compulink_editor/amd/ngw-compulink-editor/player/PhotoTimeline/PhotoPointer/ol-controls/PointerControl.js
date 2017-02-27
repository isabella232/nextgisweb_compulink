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
        _transitionEventName: null,

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

            this._transitionEventName = this._transitionEndEventName();
        },

        activate: function () {
            openlayers.Control.prototype.activate.apply(this);

            if (!this.$div) {
                this.$div = $(this.div);
            }

            this._activateLayer();
            this._makeImageContainers();
            this._activateImageContainers();
            this._updateImageContainersPositions();
        },

        deactivate: function () {
            openlayers.Control.prototype.deactivate.apply(this);
            this._deactivateLayer();
            this._deactivateImageContainers();
        },

        draw: function () {
            return openlayers.Control.prototype.draw.apply(this);
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
                lastLayer.cl_$lastImage.addClass('opacity-hidden-animated');
                lastLayer.cl_$lastImage.one(this._transitionEventName,
                    function () {
                        $(this).remove();
                    });
                lastLayer.$div
                    .removeClass('opacity-visible-animated')
                    .removeClass('opacity-hidden-animated');
                lastLayer.$div.addClass('opacity-hidden-animated');
            }

            imageContainer = this.photoOrderStrategy.getImageContainer(photoInfo);
            $imageWrapper = imageContainer.$wrapper;

            $lastImg = $imgCloned.appendTo($imageWrapper);

            newLayer = this.makePointerLine(photoInfo, imageContainer);
            newLayer.cl_$lastImage = $lastImg;
            newLayer.cl_imageContainer = imageContainer;

            newLayer.$div
                    .removeClass('opacity-visible-animated')
                    .removeClass('opacity-hidden-animated');
            newLayer.$div.addClass('opacity-visible-animated');

            newLayer.cl_$lastImage.show();
            newLayer.cl_$lastImage.addClass('scale-animated');
        },

        _transitionEndEventName: function () {
            var i,
                undefined,
                el = document.createElement('div'),
                transitions = {
                    'transition': 'transitionend',
                    'OTransition': 'otransitionend',  // oTransitionEnd in very old Opera
                    'MozTransition': 'transitionend',
                    'WebkitTransition': 'webkitTransitionEnd'
                };

            for (i in transitions) {
                if (transitions.hasOwnProperty(i) && el.style[i] !== undefined) {
                    return transitions[i];
                }
            }
        },

        _makeImageContainers: function () {
            var $imageWrappers = this._renderImagesContainers(),
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
                imageContainers.push(imageContainer);
            }));

            this._imageContainers = imageContainers;
        },

        _updateImageContainersPositions: function () {
            $.each(this._imageContainers, lang.hitch(this, function (i, imageContainer) {
                this._calculatePixelPosition(imageContainer);
                this._calculateLatlonPosition(imageContainer);
            }));
        },

        _renderImagesContainers: function () {
            var $imagesContainers;

            if (!this._imageContainers) {
                this.$div.after(mustache.render(this.template, this));
                $imagesContainers = this.$div.parent().find('div.image-wrapper');
                $imagesContainers.css('z-index', this.$div.css('z-index'));
            } else {
                $imagesContainers = this.$div.parent().find('div.image-wrapper');
            }

            return $imagesContainers;
        },

        _updateImageContainersLatlon: function () {
            array.forEach(this._imageContainers, function (imageContainer) {
                this._calculateLatlonPosition(imageContainer);
            }, this);
        },

        _calculatePixelPosition: function (imageContainer) {
            imageContainer.position.pixel = new openlayers.Pixel(
                imageContainer.$wrapper.offset().left - this.$div.parent().offset().left + this.width / 2,
                imageContainer.$wrapper.offset().top - this.$div.parent().offset().top + this.height / 2
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
            newLayer.setOpacity(1);
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

        _activateImageContainers: function () {
            $.each(this._imageContainers, lang.hitch(this, function (i, imageContainer) {
                imageContainer.$wrapper.show();
            }));
        },

        _deactivateLayer: function () {
            this.map.events.unregister('move', this, this._moveHandle);
            this.map.events.register('moveend', this, this._moveEndHandle);
            this._removeLayers();
        },

        _deactivateImageContainers: function () {
            $.each(this._imageContainers, lang.hitch(this, function (i, imageContainer) {
                imageContainer.$wrapper.hide();
            }));
        },
        
        _addLayers: function () {
            var layers = this._getLayers();
            array.forEach(layers, lang.hitch(this, function (layer) {
                this.map.addLayer(layer);
                layer.$div = $(layer.div);
                layer.$div.addClass('pointer-layer');
            }));
            return layers;
        },
        
        _removeLayers: function () {
            var layers = this._getLayers();
            array.forEach(layers, lang.hitch(this, function (layer) {
                layer.$div.removeClass('pointer-layer');
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
                layer.cl_imageContainer = layer.cl_imageContainer || null;
                layer.cl_$lastImage = layer.cl_$lastImage || null;
            }));
        }
    });
});
