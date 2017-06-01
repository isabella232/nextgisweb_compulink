define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'ngw/openlayers'
], function (declare, lang, array, on, topic, Evented, Deferred, openlayers) {
    return declare(null, {
        makeOrderedMultiline: function (multilinesFeatures) {
            var line,
                orderedMultiLinestring,
                firstPointsDict = {},
                endsPointsDict = {},
                pointStringBegin,
                pointStringEnd,
                linestrings = [],
                firstPoint, endPoint, lineValidation;

            array.forEach(multilinesFeatures, lang.hitch(this, function (multilineFeature) {
                var multilineFeatureGeometryComponents = multilineFeature.geometry.components;

                if (multilineFeatureGeometryComponents.length > 1) {
                    console.error('OrderedMultilineMaker: multiline contains more 1 line - ' + multilineFeature.id);
                }

                line = multilineFeature.geometry.components[0].clone();

                firstPoint = line.components[0];
                endPoint = line.components[line.components.length - 1];

                lineValidation = this._validateLine(line, firstPoint, endPoint);

                if (!lineValidation) return false;

                pointStringBegin = this._pointToString(firstPoint);
                if (!firstPointsDict.hasOwnProperty(pointStringBegin)) {
                    firstPointsDict[pointStringBegin] = [];
                }
                firstPointsDict[pointStringBegin].push(line);

                pointStringEnd = this._pointToString(endPoint);
                if (!endsPointsDict.hasOwnProperty(pointStringEnd)) {
                    endsPointsDict[pointStringEnd] = [];
                }
                endsPointsDict[pointStringEnd].push(line);
                linestrings.push(line);
            }));

            orderedMultiLinestring = new openlayers.Geometry.MultiLineString();
            this._checkIdenticalLine(firstPointsDict, endsPointsDict);
            this._makeOrderedMultilineString(firstPointsDict, endsPointsDict, orderedMultiLinestring);
            return orderedMultiLinestring;
        },

        _validateLine: function (line, firstPoint, endPoint) {
            firstPoint = firstPoint || line.components[0];
            endPoint = endPoint || line.components[line.components.length - 1];

            return !firstPoint.equals(endPoint);
        },

        _checkIdenticalLine: function (firstPointsDict, endsPointsDict) {
            this._checkIdenticalLineInDict(firstPointsDict);
            this._checkIdenticalLineInDict(endsPointsDict);
        },

        _checkIdenticalLineInDict: function (targetLinesDict) {
            var latLonKey,
                lines,
                line,
                currentLine,
                i, k;

            for (latLonKey in targetLinesDict) {
                if (targetLinesDict.hasOwnProperty(latLonKey)) {
                    lines = targetLinesDict[latLonKey];
                    i = lines.length;
                    if (i > 1) {
                        while (i--) {
                            currentLine = lines[i];
                            k = lines.length;
                            while (k--) {
                                line = lines[k];
                                if (currentLine.id !== line.id && this._equalsLinesByBeginEnd(currentLine, line)) {
                                    lines.splice(k, 1);
                                    console.log('Found identical lines:');
                                    console.log(currentLine);
                                    console.log(line);
                                }
                            }
                        }
                    }
                    if (lines.length === 0) {
                        delete targetLinesDict[latLonKey];
                    }
                }
            }
        },

        _equalsLinesByBeginEnd: function (line1, line2) {
            var pointsLine1 = line1.components.length,
                pointsLine2 = line2.components.length;

            if (line1.components[0].equals(line2.components[0]) &&
                line1.components[pointsLine1 - 1].equals(line2.components[pointsLine2 - 1])) {
                return true;
            }

            if (line1.components[0].equals(line2.components[pointsLine2 - 1]) &&
                line1.components[pointsLine1 - 1].equals(line2.components[0])) {
                return true;
            }

            return false;
        },

        _makeOrderedMultilineString: function (firstPointsDict, endsPointsDict, orderedMultiLinestring, beginSegments) {
            beginSegments = beginSegments || {};

            var lineInfo = this._findBeginSegment(firstPointsDict, endsPointsDict, beginSegments);
            if (!lineInfo) {
                return orderedMultiLinestring;
            }

            var segment = this._makeSegmentByXy(lineInfo, firstPointsDict, endsPointsDict, beginSegments);

            orderedMultiLinestring.addComponent(segment);
            this._makeOrderedMultilineString(firstPointsDict, endsPointsDict, orderedMultiLinestring, beginSegments);
        },

        _findBeginSegment: function (firstPointsDict, endsPointsDict, beginSegments) {
            var xy,
                line = null;
            for (xy in firstPointsDict) {
                if (firstPointsDict.hasOwnProperty(xy)) {
                    if (firstPointsDict[xy].length === 1 && !endsPointsDict[xy]) {
                        line = firstPointsDict[xy][0];
                        if (beginSegments[line.id]) {
                            line = null;
                        } else {
                            beginSegments[line.id] = true;
                            break;
                        }
                    }
                }
            }

            if (line) return {
                line: line,
                dict: 'first'
            };

            for (xy in endsPointsDict) {
                if (endsPointsDict.hasOwnProperty(xy)) {
                    if (endsPointsDict[xy].length === 1 && !firstPointsDict[xy]) {
                        line = endsPointsDict[xy][0];
                        if (beginSegments[line.id]) {
                            line = null;
                        } else {
                            beginSegments[line.id] = true;
                            break;
                        }
                    }
                }
            }

            if (line) return {
                line: line,
                dict: 'end'
            };
        },

        _makeSegmentByXy: function (lineInfo, firstPointsDict, endsPointsDict, beginSegments) {
            var segment = new openlayers.Geometry.LineString(),
                firstLinePoints = this._getPointsFromLine(lineInfo);

            array.forEach(firstLinePoints, function (point) {
                segment.addPoint(point);
            });

            this._buildSegment(segment, lineInfo, firstPointsDict, endsPointsDict, beginSegments);

            return segment;
        },

        _buildSegment: function (segment, lastLineInfo, firstPointsDict, endsPointsDict, beginSegments) {
            var relatedLineInfo,
                points;

            relatedLineInfo = this._getRelatedLineInfo(segment, lastLineInfo, firstPointsDict, endsPointsDict);

            if (relatedLineInfo) {
                points = this._getPointsFromLine(relatedLineInfo);
                array.forEach(points, function (point, i) {
                    if (i !== 0) {
                        segment.addPoint(point);
                    }
                });
                this._buildSegment(segment, relatedLineInfo, firstPointsDict, endsPointsDict, beginSegments);
            } else {
                beginSegments[lastLineInfo.line.id] = true;
                return segment;
            }
        },

        _getRelatedLineInfo: function (segment, lastLineInfo, firstPointsDict, endsPointsDict) {
            var countSegmentPoints = segment.components.length,
                lastSegmentPoint = segment.components[countSegmentPoints - 1],
                lastSegmentPointXy,
                lines,
                relatedLine = null,
                xy;

            lastSegmentPointXy = this._pointToString(lastSegmentPoint);

            for (xy in firstPointsDict) {
                if (firstPointsDict.hasOwnProperty(xy)) {
                    if (xy === lastSegmentPointXy) {
                        lines = firstPointsDict[xy];
                        array.some(lines, function (line) {
                            if (line.id !== lastLineInfo.line.id) {
                                relatedLine = line;
                                return false;
                            }
                        });
                        if (relatedLine) break;
                    }
                }
            }

            if (relatedLine) return {
                line: relatedLine,
                dict: 'first'
            };

            for (xy in endsPointsDict) {
                if (endsPointsDict.hasOwnProperty(xy)) {
                    if (xy === lastSegmentPointXy) {
                        lines = endsPointsDict[xy];
                        array.some(lines, function (line) {
                            if (line.id !== lastLineInfo.line.id) {
                                relatedLine = line;
                                return false;
                            }
                        });
                        if (relatedLine) break;
                    }
                }
            }

            if (relatedLine) {
                return {
                    line: relatedLine,
                    dict: 'end'
                };
            } else {
                return false;
            }
        },

        _getPointsFromLine: function (lineInfo) {
            if (lineInfo.dict === 'first') {
                return lineInfo.line.components;
            } else if (lineInfo.dict === 'end') {
                var countComponents = lineInfo.line.components.length,
                    points = [];
                for (var i = countComponents - 1; i >= 0; i--) {
                    points.push(lineInfo.line.components[i]);
                }
                return points;
            }
        },

        _pointToString: function (point) {
            return (point.x * 1000000000) + ' ' + (point.y * 1000000000);
        }
    });
});