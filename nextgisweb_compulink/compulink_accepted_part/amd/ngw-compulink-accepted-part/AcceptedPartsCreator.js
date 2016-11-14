define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/aspect',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers',
    './ui/CreateAcceptedPartDialog/CreateAcceptedPartDialog'
], function (declare, lang, array, on, topic, aspect, Evented, Deferred, openlayers,
             CreateAcceptedPartDialog) {
    return declare(null, {
        ACCEPTED_PARTS_TOLERANCE: 100,
        OPTICAL_CABLE_LAYER_TOLERANCE: 20,

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

            aspect.after(this._drawFeatureControl.handler, 'up', lang.hitch(this, this._afterDrawUpHandler));

            this._snappingControl = new openlayers.Control.Snapping({
                layer: this._acceptedPartsLayer._layer,
                targets: [
                    {
                        layer: this._acceptedPartsLayer._layer,
                        tolerance: this.ACCEPTED_PARTS_TOLERANCE,
                        edge: false
                    },
                    {
                        layer: this._actualRealOpticalCableLayer._layer,
                        tolerance: this.OPTICAL_CABLE_LAYER_TOLERANCE,
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
        },

        _deactivate: function () {
            this._map.olMap.removeControl(this._drawFeatureControl);
            this._snappingControl.deactivate();
            this._drawFeatureControl.deactivate();
        },

        _lastPointVerified: {
            result: false,
            pointsInSketchLine: 0
        },

        _createPointSketchHandler: function (point, sketchLine) {
            var pointsInSketchLine = sketchLine.components.length;

            if (pointsInSketchLine === 2) {
                this._lastPointVerifyResult = {
                    result: this._verifyStartPoint(point, sketchLine),
                    pointsInSketchLine: pointsInSketchLine
                };
            }

            if (pointsInSketchLine === 3) {
                this._lastPointVerifyResult = {
                    result: this._verifyEndPoint(point, sketchLine),
                    pointsInSketchLine: pointsInSketchLine
                };
            }
        },

        _afterDrawUpHandler: function () {
            if (this._lastPointVerifyResult.result && this._lastPointVerifyResult.pointsInSketchLine === 2) return true;

            // if start point, then this._lastPointVerifyResult.pointsInSketchLine === 2
            if (this._lastPointVerifyResult.pointsInSketchLine === 2) {
                this._drawFeatureControl.cancel();
                return true;
            }

            // if this._lastPointVerifyResult.pointsInSketchLine !== 2 then current point is end point
            if (this._lastPointVerifyResult.result) {
                var acceptedGeometry = this._createAcceptedPartGeometry();
                if (acceptedGeometry) {
                    this._drawFeatureControl.cancel();
                    this._openCreateAcceptedPartsDialog(acceptedGeometry);
                }
            } else {
                this._drawFeatureControl.undo();
                return true;
            }
        },

        _openCreateAcceptedPartsDialog: function (acceptedPartGeometry) {
            var acceptedPartDialog = new CreateAcceptedPartDialog({
                id: 'createAcceptedPartDialog',
                title: 'Создать принятый участок',
                handlerOk: lang.hitch(this, function () {
                    this._createAcceptedPart(acceptedPartDialog, acceptedPartGeometry);
                }),
                handlerCancel: lang.hitch(this, function () {}),
                isDestroyedAfterHiding: true
            });
            acceptedPartDialog.show();
        },

        _createAcceptedPart: function (acceptedPartDialog, acceptedPartGeometry) {
            var wkt = new openlayers.Format.WKT(),
                acceptedPartFeature = new openlayers.Feature.Vector(new openlayers.Geometry.MultiLineString([acceptedPartGeometry])),
                acceptedPart = {},
                $input;
            $(acceptedPartDialog.domNode).find('input[data-field]').each(function (i, input) {
                $input = $(input);
                acceptedPart[$input.data('field')] = input.value;
            });
            acceptedPart.geom = wkt.write(acceptedPartFeature);
            this._acceptedPartsStore.createAcceptedPart(acceptedPart);
        },

        _verifyStartPoint: function (point, sketchLine) {
            var startPoint = sketchLine.components[0];
            return (this._isPointContainsInLinesLayer(startPoint, this._actualRealOpticalCableLayer._layer) === true) &&
                (this._verifyPointByAcceptedPartsLayer(startPoint));
        },

        _verifyEndPoint: function (point, sketchLine) {
            var startPoint = sketchLine.components[0],
                endPoint = sketchLine.components[1],
                linestring;

            if (this._isPointContainsInLinesLayer(endPoint, this._actualRealOpticalCableLayer._layer) !== true ||
                this._verifyPointByAcceptedPartsLayer(startPoint) !== true) {
                return false;
            }

            if (startPoint.distanceTo(endPoint) === 0) {
                return false;
            }

            linestring = this._pointsOnOneLine(startPoint, endPoint, this._actualRealOpticalCableLayer._layer.features[0].geometry);
            if (!linestring) {
                return false;
            }

            return {
                startPoint: startPoint,
                endPoint: endPoint,
                linestring: linestring
            };
        },

        _verifyPointByAcceptedPartsLayer: function (point) {
            if (this._isPointContainsInLinesLayer(point, this._acceptedPartsLayer._layer) === false) {
                return true;
            }

            var acceptedPartFeatures = this._acceptedPartsLayer._layer.features,
                countAcceptedParts = acceptedPartFeatures.length,
                countPointsInAcceptedPart,
                acceptedPartLine;

            for (var i = 0; i < countAcceptedParts; i++) {
                acceptedPartLine = acceptedPartFeatures[i].geometry.components[0];
                countPointsInAcceptedPart = acceptedPartLine.components.length;
                if (point.equals(acceptedPartLine.components[0])) return true;
                if (point.equals(acceptedPartLine.components[countPointsInAcceptedPart - 1])) return true;
            }

            return false;
        },

        _pointsOnOneLine: function (startPoint, endPoint, multiline) {
            var isPointsOneLine = false;

            array.forEach(multiline.components, lang.hitch(this, function (linestring) {
                if (this._isPointContainsInLine(startPoint, linestring) &&
                    this._isPointContainsInLine(endPoint, linestring)) {
                    isPointsOneLine = linestring;
                    return false;
                }
            }));

            return isPointsOneLine;
        },

        _intersectsWithLayer: function (geometry, layer) {
            array.forEach(layer.features, function (feature) {
                if (geometry.intersects(feature.geometry)) return true;
            });
            return false;
        },

        _isPointContainsInLinesLayer: function (point, linesLayer) {
            var contained = false;
            array.forEach(linesLayer.features, lang.hitch(this, function (feature) {
                if (this._isPointContainsInLine(point, feature.geometry)) {
                    contained = true;
                    return true;
                }
            }));
            return contained;
        },

        _isPointContainsInLine: function (point, line) {
            return point.distanceTo(line) === 0;
        },

        _createAcceptedPartGeometry: function () {
            var verificationResult = this._lastPointVerifyResult.result,
                startPoint = verificationResult.startPoint,
                endPoint = verificationResult.endPoint,
                linestringPoints = verificationResult.linestring.components,
                linestringPointsCount = linestringPoints.length,
                acceptedPartGeometry = new openlayers.Geometry.LineString(),
                acceptedPartGeometryCreating = false,
                startPointContained, endPointContained,
                pointContained,
                linePoint,
                segment;

            for (var i = 0; i < linestringPointsCount; i++) {
                linePoint = linestringPoints[i];

                if (i === 0 && (linePoint.equals(startPoint) || linePoint.equals(endPoint))) {
                    acceptedPartGeometry.addComponent(linePoint);
                    acceptedPartGeometryCreating = true;
                    continue;
                }

                if (i === linestringPointsCount - 1) {
                    break;
                }

                segment = new openlayers.Geometry.LineString([linestringPoints[i - 1], linePoint]);

                startPointContained = this._isPointContainsInLine(startPoint, segment);
                endPointContained = this._isPointContainsInLine(endPoint, segment);

                if (startPointContained && endPointContained) {
                    acceptedPartGeometry = new openlayers.Geometry.LineString([startPoint, endPoint]);
                    break;
                }

                if (startPointContained || endPointContained) {
                    pointContained = startPointContained ? startPoint : endPoint;
                    if (acceptedPartGeometryCreating) {
                        acceptedPartGeometry.addComponent(pointContained);
                        break;
                    }
                    if (linestringPoints[i + 1].equals(pointContained)) {
                        acceptedPartGeometry.addComponent(pointContained);
                    } else {
                        acceptedPartGeometry.addComponent(pointContained);
                        acceptedPartGeometry.addComponent(linestringPoints[i + 1]);
                    }
                    acceptedPartGeometryCreating = true;
                    continue;
                }

                if (acceptedPartGeometryCreating) {
                    acceptedPartGeometry.addComponent(linePoint);
                }
            }

            if (acceptedPartGeometry.components.length > 1) {
                return acceptedPartGeometry;
            } else {
                return null;
            }
        }
    });
});