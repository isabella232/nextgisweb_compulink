define([
    'dojo/_base/lang',
    'ngw/openlayers',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./PhotoPointer.mustache',
    'xstyle/css!./PhotoPointer.css'
], function (lang, openlayers, mustache, template) {
    return openlayers.Class(openlayers.Control, {
        CLASS_NAME: 'OpenLayers.Control.PhotoPointer',
        template: mustache.parse(template),
        _pointerLayer: null,

        _style: {
            strokeColor: '#2175C3',
            strokeOpacity: 0.8,
            strokeWidth: 2,
            strokeDashstyle: 'longdash'
        },

        draw: function () {
            var div = openlayers.Control.prototype.draw.apply(this);
            div.innerHTML = mustache.render(template, this);
            return div;
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
         * Cached height of view port for calculating position of start point
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

        activate: function () {
            openlayers.Control.prototype.activate.apply(this);
            this._activateLayer();
        },

        deactivate: function () {
            openlayers.Control.prototype.deactivate.apply(this);
            this._deactivateLayer();
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
