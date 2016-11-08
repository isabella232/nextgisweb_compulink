define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/aspect',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers'
], function (declare, lang, array, on, topic, aspect, Evented, Deferred, openlayers) {
    return declare(null, {
        _drawFeatureControl: null,
        _snappingControl: null,
        _acceptedPartsStore: null,
        _acceptedPartsLayer: null,
        _actualRealOpticalCableStore: null,
        _actualRealOpticalCableLayer: null,

        constructor: function (map, acceptedPartsStore, acceptedPartsLayer, actualRealOpticalCableStore,
                               actualRealOpticalCableLayer) {
            this._map = map;
            this._acceptedPartsStore = acceptedPartsStore;
            this._acceptedPartsLayer = acceptedPartsLayer;
            this._actualRealOpticalCableStore = actualRealOpticalCableStore;
            this._actualRealOpticalCableLayer = actualRealOpticalCableLayer;
            this._bindEvents();
            this._createControls();
        },

        _bindEvents: function () {
            topic.subscribe('compulink/accepted-parts/ui/create-new-accepted-part/changed', lang.hitch(this, function (state) {
                if (state) {
                    this._activate();
                } else {
                    this._deactivate();
                }
            }));
        },

        _createControls: function () {
            this._drawFeatureControl = new openlayers.Control.DrawFeature(
                this._acceptedPartsLayer._layer,
                openlayers.Handler.Path
            );

            this._drawFeatureControl.handler.callbacks.point = lang.hitch(this, this._createPointSketchHandler);

            aspect.after(this._drawFeatureControl.handler, 'addPoint', lang.hitch(this, function (a) {
                console.log(a);
            }));

            this._snappingControl = new openlayers.Control.Snapping({
                layer: this._acceptedPartsLayer._layer,
                targets: [
                    {
                        layer: this._acceptedPartsLayer._layer,
                        tolerance: 100,
                        edge: false
                    },
                    {
                        layer: this._actualRealOpticalCableLayer._layer,
                        tolerance: 20,
                        node: false,
                        vertex: false,
                        edge: true
                    }
                ],
                greedy: false
            });
        },

        _activate: function () {
            this._map.olMap.addControl(this._drawFeatureControl);
            this._snappingControl.activate();
            this._drawFeatureControl.activate();

            // this._acceptedPartsLayer._layer.events.register('sketchcomplete',
            //     this._acceptedPartsLayer._layer, function (a1, a2) {
            //         console.log(a1);
            //         console.log(a2);
            //     });
        },

        _deactivate: function () {
            this._map.olMap.removeControl(this._drawFeatureControl);
            this._snappingControl.deactivate();
            this._drawFeatureControl.deactivate();
        },

        _createPointSketchHandler: function (point, sketchLine) {
            var verifyResult,
                pointsInSketchLine = sketchLine.components.length;

            if (pointsInSketchLine === 2) {
                verifyResult = this._verifyStartPoint(point, sketchLine);
                if (!verifyResult) {
                    this._drawFeatureControl.cancel();
                }
            }

            if (pointsInSketchLine === 3) {

            }
        },

        _verifyStartPoint: function (point, sketchLine) {
            var startPoint = sketchLine.components[0];
            return this._isPointContainsInLinesLayer(startPoint, this._actualRealOpticalCableLayer._layer) &&
                !this._isPointContainsInLinesLayer(startPoint, this._acceptedPartsLayer._layer);
        },

        _intersectsWithLayer: function (geometry, layer) {
            array.forEach(layer.features, function (feature) {
                if (geometry.intersects(feature.geometry)) return true;
            });
            return false;
        },

        _isPointContainsInLinesLayer: function (point, linesLayer) {
            array.forEach(linesLayer.features, lang.hitch(this, function (feature) {
                if (this._isPointContainsInLine(point, feature.geometry)) {
                    return true;
                }
            }));
            return false;
        } ,

        _isPointContainsInLine: function (point, line) {
            return point.distanceTo(line) === 0;
        }
    });
});