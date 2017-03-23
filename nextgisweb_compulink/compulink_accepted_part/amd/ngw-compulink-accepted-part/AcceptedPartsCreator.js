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
    './ui/CreateAcceptedPartDialog/CreateAcceptedPartDialog',
    './ui/AcceptedPartsTooltip/AcceptedPartsTooltip'
], function (declare, lang, array, on, topic, aspect, Evented, Deferred, openlayers,
             CreateAcceptedPartDialog, AcceptedPartsTooltip) {
    return declare(null, {
        ACCEPTED_PARTS_TOLERANCE: 40,
        OPTICAL_CABLE_LAYER_LINES_TOLERANCE: 20,
        OPTICAL_CABLE_LAYER_POINTS_TOLERANCE: 30,

        _drawFeatureControl: null,
        _snappingControl: null,
        _acceptedPartsStore: null,
        _acceptedPartsLayer: null,
        _actualRealOpticalCableStore: null,
        _actualRealOpticalCableLayer: null,
        _acceptedPartsTooltip: null,

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
                    topic.publish('compulink/accepted-parts/layers/first-point/undo/off');
                }
            }));

            topic.subscribe('compulink/accepted-parts/layers/first-point/undo', lang.hitch(this, function () {
                if (this._lastPointVerifyResult.pointsInSketchLine === 2) {
                    this._drawFeatureControl.cancel();
                    topic.publish('compulink/accepted-parts/layers/first-point/undo/off');
                    this._setTooltipStartMessage();
                    return true;
                }
            }));

            on(this._acceptedPartsStore, 'cleared', lang.hitch(this, function () {
                this._deactivate();
            }));
        },

        _createControls: function () {
            var defaultDrawControlStyle;

            this._drawFeatureControl = new openlayers.Control.DrawFeature(
                this._acceptedPartsLayer._layer,
                openlayers.Handler.Path
            );

            defaultDrawControlStyle = this._drawFeatureControl.handlerOptions.layerOptions.styleMap.styles.default.defaultStyle;
            defaultDrawControlStyle.strokeOpacity = 0;
            defaultDrawControlStyle.fillColor = 'red';
            defaultDrawControlStyle.fillOpacity = 1;
            defaultDrawControlStyle.pointRadius = 8;

            this._drawFeatureControl.handler.callbacks.point = lang.hitch(this, this._createPointSketchHandler);

            this._drawFeatureControl.handler.dblclick = lang.hitch(this, function () {
                return true;
            });

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
                        tolerance: this.OPTICAL_CABLE_LAYER_LINES_TOLERANCE,
                        node: false,
                        vertex: false,
                        edge: true
                    },
                    {
                        layer: this._actualRealOpticalCableLayer._layer,
                        tolerance: this.OPTICAL_CABLE_LAYER_POINTS_TOLERANCE,
                        node: false,
                        vertex: true,
                        edge: false
                    }
                ],
                greedy: false
            });

            this._acceptedPartsTooltip = new AcceptedPartsTooltip(this._map);
        },

        _activate: function () {
            this._map.olMap.addControl(this._drawFeatureControl);
            this._snappingControl.activate();
            this._drawFeatureControl.activate();
            this._setDrawLayerZIndex();
            this._acceptedPartsTooltip.activate('Введите начальную точку');
        },

        _setDrawLayerZIndex: function () {
            this._drawFeatureControl.handler.layer.cl_zIndex = 999999;
            this._drawFeatureControl.handler.layer.setZIndex(999999);
        },

        _deactivate: function () {
            this._map.olMap.removeControl(this._drawFeatureControl);
            this._snappingControl.deactivate();
            this._drawFeatureControl.deactivate();
            this._acceptedPartsTooltip.deactivate();
        },

        _lastPointVerifyResult: {
            result: false,
            pointsInSketchLine: 0
        },

        _isCreateCalled: false,

        _createPointSketchHandler: function (point, sketchLine) {
            var pointsInSketchLine = sketchLine.components.length,
                verifyResult = true;

            this._isCreateCalled = true;

            if (pointsInSketchLine === 2) {
                verifyResult = this._verifyStartPoint(point, sketchLine);
                this._lastPointVerifyResult = {
                    result: verifyResult,
                    pointsInSketchLine: pointsInSketchLine
                };
            }

            if (pointsInSketchLine === 3) {
                verifyResult = this._verifyEndPoint(point, sketchLine);
                this._lastPointVerifyResult = {
                    result: verifyResult,
                    pointsInSketchLine: pointsInSketchLine
                };
            }
        },

        _afterDrawUpHandler: function () {
            if (!this._lastPointVerifyResult) return true;
            var pointsInSketchLine = this._lastPointVerifyResult.pointsInSketchLine;

            // check points consistency
            if (pointsInSketchLine > 3) {
                console.error(new Exception('_afterDrawUpHandler: pointsInSketchLine = ' + pointsInSketchLine));
            } else if (pointsInSketchLine < 2) {
                return true;
            }

            // if moving map by pressed left mouse button
            // this._isCreateCalled should be equal false
            if (this._isCreateCalled) {
                this._isCreateCalled = false;
            } else {
                if (pointsInSketchLine === 3) this._drawFeatureControl.undo();
                return true;
            }

            if (this._lastPointVerifyResult.result && pointsInSketchLine === 2) {
                topic.publish('compulink/accepted-parts/layers/first-point/undo/on');
                this._makeStartPoint();
                this._setTooltipEndMessage();
                this._resetLastPointVerifyResult();
                return true;
            }

            // if start point, then this._lastPointVerifyResult.pointsInSketchLine === 2
            if (this._lastPointVerifyResult.pointsInSketchLine === 2) {
                this._drawFeatureControl.cancel();
                this._resetLastPointVerifyResult();
                return true;
            }

            // if this._lastPointVerifyResult.pointsInSketchLine !== 2 then current point is end point
            if (this._lastPointVerifyResult.result) {
                topic.publish('compulink/accepted-parts/layers/first-point/undo/off');
                if (this._lastPointVerifyResult.result.acceptedPartGeometry) {
                    this._openCreateAcceptedPartsDialog(this._lastPointVerifyResult.result.acceptedPartGeometry);
                } else {
                    this._drawFeatureControl.cancel();
                }
                this._resetLastPointVerifyResult();
                this._setTooltipStartMessage();
            } else {
                this._drawFeatureControl.undo();
                this._resetLastPointVerifyResult();
                this._lastPointVerifyResult.pointsInSketchLine = pointsInSketchLine - 1;
                return true;
            }
        },

        _resetLastPointVerifyResult: function () {
            this._lastPointVerifyResult.result = false;
        },

        _makeStartPoint: function () {
            var drawLayer = this._drawFeatureControl.handler.layer,
                featuresCount = drawLayer.features.length,
                startPointFeature;

            if (featuresCount > 2) {
                return false;
            }

            startPointFeature = drawLayer.features[1].clone();
            drawLayer.addFeatures(startPointFeature);
        },

        _openCreateAcceptedPartsDialog: function (acceptedPartGeometry) {
            var acceptedPartDialog = new CreateAcceptedPartDialog({
                acceptedPartsStore: this._acceptedPartsStore,
                acceptedPartGeometryWkt: this._getAcceptedPartWkt(acceptedPartGeometry)
            });

            aspect.after(acceptedPartDialog, 'hide', lang.hitch(this, function () {
                this._drawFeatureControl.cancel();
            }));

            acceptedPartDialog.show();
        },

        _getAcceptedPartWkt: function (acceptedPartGeometry) {
            var wkt = new openlayers.Format.WKT(),
                multiLinestring = new openlayers.Geometry.MultiLineString([acceptedPartGeometry]),
                acceptedPartFeature = new openlayers.Feature.Vector(multiLinestring);
            return wkt.write(acceptedPartFeature);
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
                linestring,
                acceptedPartGeometry,
                intersectsWithAcceptedPartsLayer;

            if (this._isPointContainsInLinesLayer(endPoint, this._actualRealOpticalCableLayer._layer) === false) {
                return false;
            }

            if (this._isPointContainsInLinesLayer(endPoint, this._acceptedPartsLayer._layer) === true) {
                if (this._verifyPointByAcceptedPartsLayer(endPoint) === false) return false;
            }

            if (startPoint.distanceTo(endPoint) === 0) {
                return false;
            }

            linestring = this._getLineContainedPoints(startPoint, endPoint, 
                this._actualRealOpticalCableLayer._layer.features[0].geometry);
            if (!linestring) {
                return false;
            }

            acceptedPartGeometry = this._createAcceptedPartGeometry(linestring, startPoint, endPoint);
            if (!acceptedPartGeometry) return false;

            intersectsWithAcceptedPartsLayer = this._intersectsWithLayer(acceptedPartGeometry, this._acceptedPartsLayer._layer);

            if (intersectsWithAcceptedPartsLayer && this._checkBoundaryAcceptedPartsGeometry(acceptedPartGeometry)) {
                return false;
            }

            return {
                acceptedPartGeometry: acceptedPartGeometry
            };
        },

        _checkBoundaryAcceptedPartsGeometry: function (acceptedPartGeometry) {
            var reducedGeometry = new openlayers.Geometry.LineString(),
                countPoints = acceptedPartGeometry.components.length,
                reduceDistance = 0.5,
                pointReduced;

            array.forEach(acceptedPartGeometry.components, lang.hitch(this, function (point, i) {
                if (i === 0) {
                    pointReduced = this._getPointOnLineByDistance(point,
                        acceptedPartGeometry.components[1], reduceDistance);
                    reducedGeometry.addComponent(pointReduced);
                } else if (i === countPoints - 1) {
                    pointReduced = this._getPointOnLineByDistance(acceptedPartGeometry.components[countPoints - 2],
                        point, reduceDistance);
                    reducedGeometry.addComponent(pointReduced);
                } else {
                    reducedGeometry.addComponent(point);
                }
            }));

            return this._intersectsWithLayer(reducedGeometry, this._acceptedPartsLayer._layer);
        },

        _getPointOnLineByDistance: function (startPoint, endPoint, distance) {
            var d = startPoint.distanceTo(endPoint),
                t, x, y;
            t = distance / d;

            x = (1 - t) * startPoint.x + t * endPoint.x;
            y = (1 - t) * startPoint.y + t * endPoint.y;

            return new openlayers.Geometry.Point(x, y);
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

        _getLineContainedPoints: function (startPoint, endPoint, multiline) {
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
            var featureGeometry,
                lineString,
                intersected = false;

            array.some(layer.features, function (feature) {
                featureGeometry = feature.geometry;
                // if (featureGeometry.id.indexOf('MultiLineString') > -1) {
                //     lineString = featureGeometry.components[0];
                //     if (geometry.intersects(lineString)) {
                //         intersected = true;
                //         return false;
                //     }
                // } else {
                if (geometry.intersects(feature.geometry)) {
                    intersected = true;
                    return false;
                }
                // }
            });
            return intersected;
        },

        _isPointContainsInLinesLayer: function (point, linesLayer) {
            var contained = false;
            array.some(linesLayer.features, lang.hitch(this, function (feature) {
                if (this._isPointContainsInLine(point, feature.geometry)) {
                    contained = true;
                    return false;
                }
            }));
            return contained;
        },

        _isPointContainsInLine: function (point, line) {
            return point.distanceTo(line) === 0;
        },

        _createAcceptedPartGeometry: function (linestring, point1, point2) {
            var linestringPoints = linestring.components,
                linestringPointsCount = linestringPoints.length,
                acceptedPartGeometry = new openlayers.Geometry.LineString(),
                acceptedPartGeometryCreating = false,
                containedPoint1, containedPoint2,
                pointContained,
                linePoint,
                segment,
                segmentStartPoint,
                segmentEndPoint,
                isBeginSegment, isEndSegment;

            for (var i = 0; i < linestringPointsCount; i++) {
                linePoint = linestringPoints[i];

                if (i === 0) {
                    continue;
                }

                segment = new openlayers.Geometry.LineString([linestringPoints[i - 1], linePoint]);
                segmentStartPoint = linestringPoints[i - 1];
                segmentEndPoint = linePoint;

                containedPoint1 = this._isPointContainsInLine(point1, segment);
                containedPoint2 = this._isPointContainsInLine(point2, segment);

                if (containedPoint1 && containedPoint2) {
                    acceptedPartGeometry = new openlayers.Geometry.LineString([point1, point2]);
                    break;
                }

                if (containedPoint1 || containedPoint2) {
                    pointContained = containedPoint1 ? point1 : point2;

                    isBeginSegment = segmentStartPoint.equals(pointContained);
                    isEndSegment = segmentEndPoint.equals(pointContained);

                    if (acceptedPartGeometryCreating) {
                        if (isEndSegment) {
                            acceptedPartGeometry.addComponent(segmentEndPoint);
                            break;
                        } else if (isBeginSegment) {
                            acceptedPartGeometry.addComponent(segmentEndPoint);
                            continue;
                        } else {
                            acceptedPartGeometry.addComponent(pointContained);
                            break;
                        }
                    } else {
                        if (isBeginSegment) {
                            acceptedPartGeometry = new openlayers.Geometry.LineString(
                                [segmentStartPoint, segmentEndPoint]);
                        } else if (isEndSegment) {
                            acceptedPartGeometry = new openlayers.Geometry.LineString();
                            acceptedPartGeometry.addComponent(segmentEndPoint);
                        } else {
                            acceptedPartGeometry = new openlayers.Geometry.LineString(
                                [pointContained, segmentEndPoint]);
                        }
                        acceptedPartGeometryCreating = true;
                        continue;
                    }
                }

                if (acceptedPartGeometryCreating) {
                    acceptedPartGeometry.addComponent(segmentEndPoint);
                }
            }

            if (acceptedPartGeometry.components.length > 1) {
                return acceptedPartGeometry;
            } else {
                return null;
            }
        },

        _setTooltipStartMessage: function () {
            this._acceptedPartsTooltip.updateMessage('Введите начальную точку');
        },

        _setTooltipEndMessage: function () {
            this._acceptedPartsTooltip.updateMessage('Введите конечную точку');
        }
    });
});