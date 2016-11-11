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
                linestrings = [];

            array.forEach(multilinesFeatures, lang.hitch(this, function (multiline) {
                line = multiline.geometry.components[0].clone();

                pointStringBegin = this._pointToString(line.components[0]);
                if (!firstPointsDict.hasOwnProperty(pointStringBegin)) {
                    firstPointsDict[pointStringBegin] = [];
                }
                firstPointsDict[pointStringBegin].push(line);

                pointStringEnd = this._pointToString(line.components[line.components.length - 1]);
                if (!endsPointsDict.hasOwnProperty(pointStringEnd)) {
                    endsPointsDict[pointStringEnd] = [];
                }
                endsPointsDict[pointStringEnd].push(line);
                linestrings.push(line);
            }));

            orderedMultiLinestring = new openlayers.Geometry.MultiLineString();
            this._normalizeLinestrings(linestrings, firstPointsDict, endsPointsDict, orderedMultiLinestring);
            return orderedMultiLinestring;
        },

        // it normalize lines so that end of one line is begin of next line
        _normalizeLinestrings: function (sourceLineStrings, firstPointsDict, endsPointsDict, orderedMultiLinestring) {
            var countSourceLineStrings = sourceLineStrings.length,
                countOrderedLinestrings,
                firstLineProcessResult,
                connectedLine,
                lastOrderedMultiLinestringComponents;

            if (countSourceLineStrings === 0) {
                return orderedMultiLinestring;
            }

            countOrderedLinestrings = orderedMultiLinestring.components.length;
            if (countOrderedLinestrings === 0) {
                firstLineProcessResult = this._processFirstLine(firstPointsDict, endsPointsDict, orderedMultiLinestring);
                if (firstLineProcessResult) {
                    this._normalizeLinestrings(sourceLineStrings, firstPointsDict, endsPointsDict, orderedMultiLinestring);
                }
            } else {
                lastOrderedMultiLinestringComponents = this._getMultiLinestringLastComponents(orderedMultiLinestring);
                connectedLine = this._findConnectedLine(firstPointsDict, endsPointsDict, lastOrderedMultiLinestringComponents);
                if (connectedLine) {
                    this._addLineToOrderedMultiLinestring(connectedLine, orderedMultiLinestring, lastOrderedMultiLinestringComponents);
                    this._normalizeLinestrings(sourceLineStrings, firstPointsDict, endsPointsDict, orderedMultiLinestring);
                } else {
                    firstLineProcessResult = this._processFirstLine(firstPointsDict, endsPointsDict, orderedMultiLinestring);
                    if (firstLineProcessResult) {
                        this._normalizeLinestrings(sourceLineStrings, firstPointsDict, endsPointsDict, orderedMultiLinestring);
                    }
                }
            }
        },

        _processFirstLine: function (firstPointsDict, endsPointsDict, orderedMultiLinestring) {
            var firstLine = this._findFirstLine(firstPointsDict, endsPointsDict, orderedMultiLinestring);
            if (firstLine) {
                orderedMultiLinestring.addComponent(firstLine);
                return true;
            } else {
                return false;
            }
        },

        _getMultiLinestringLastComponents: function (orderedMultiLinestring) {
            var currentLastLine,
                currentLastPoint,
                currentLastPointString,
                countLinesInOrderedMultiLinestring = orderedMultiLinestring.components.length,
                countPointsInLastLine;
            currentLastLine = orderedMultiLinestring.components[countLinesInOrderedMultiLinestring - 1];
            countPointsInLastLine = currentLastLine.components.length;
            currentLastPoint = currentLastLine.components[countPointsInLastLine - 1];
            currentLastPointString = this._pointToString(currentLastPoint);

            return {
                lastLine: {
                    index: countLinesInOrderedMultiLinestring - 1,
                    line: currentLastLine
                },
                lastPoint: {
                    index: countPointsInLastLine - 1,
                    point: currentLastPoint,
                    key: currentLastPointString
                }
            }
        },

        _addLineToOrderedMultiLinestring: function (linestring, orderedMultiLinestring, lastOrderedMultiLinestringComponents) {
            array.forEach(linestring.components, function (point, i) {
                if (i !== 0) {
                    lastOrderedMultiLinestringComponents.lastLine.line.addComponent(point.clone());
                }
            });
        },

        _findConnectedLine: function (firstPointsDict, endsPointsDict, lastOrderedMultiLinestringComponents) {
            var currentLastPointString = lastOrderedMultiLinestringComponents.lastPoint.key,
                foundLine;

            if (firstPointsDict.hasOwnProperty(currentLastPointString)) {
                foundLine = firstPointsDict[currentLastPointString][0];
                delete firstPointsDict[currentLastPointString];
                return foundLine;
            }
            if (endsPointsDict.hasOwnProperty(currentLastPointString)) {
                foundLine = endsPointsDict[currentLastPointString][0];
                delete endsPointsDict[currentLastPointString];
                return new openlayers.Geometry.LineString(foundLine.components.reverse());
            }
            return false;
        },

        _findFirstLine: function (firstPointsDict, endsPointsDict) {
            var firstLineFoundByFirst,
                firstLine,
                reversedLineString;

            firstLine = this._findFirstLineByFirstPoint(firstPointsDict, endsPointsDict);

            if (!firstLine) {
                firstLine = this._findFirstLineByLastPoint(firstPointsDict, endsPointsDict);
                firstLineFoundByFirst = false;
            }

            if (!firstLine) {
                return false;
            }

            if (firstLineFoundByFirst) {
                return firstLine;
            } else {
                reversedLineString = new openlayers.Geometry.LineString(firstLine.components.reverse());
                return reversedLineString;
            }
        },

        _findFirstLineByFirstPoint: function (firstPointsDict, endsPointsDict) {
            var firstPoint,
                foundFirstLine = false,
                line;

            for (firstPoint in firstPointsDict) {
                if (!firstPointsDict.hasOwnProperty(firstPoint)) {
                    continue;
                }
                if (firstPoint in endsPointsDict) {
                    continue;
                } else {
                    if (firstPointsDict[firstPoint].length === 1) {
                        foundFirstLine = firstPointsDict[firstPoint][0];
                        break;
                    }
                }
            }

            if (foundFirstLine) {
                line = foundFirstLine.clone();
                delete firstPointsDict[firstPoint];
                this._removeLinestringFromDict(endsPointsDict, foundFirstLine);
                return line;
            } else {
                return false;
            }
        },

        _findFirstLineByLastPoint: function (firstPointsDict, endsPointsDict) {
            var lastPoint,
                line,
                foundFirstLine = false;

            for (lastPoint in endsPointsDict) {
                if (!endsPointsDict.hasOwnProperty(lastPoint)) {
                    continue;
                }
                if (lastPoint in firstPointsDict) {
                    continue;
                } else {
                    if (endsPointsDict[lastPoint].length === 1) {
                        foundFirstLine = endsPointsDict[lastPoint][0];
                        break;
                    }
                }
            }

            if (foundFirstLine) {
                line = foundFirstLine.clone();
                delete endsPointsDict[lastPoint];
                this._removeLinestringFromDict(firstPointsDict, foundFirstLine);
                return line;
            } else {
                return false;
            }
        },

        _removeLinestringFromDict: function (pointsDict, linestring) {
            var firstPoint = this._pointToString(linestring.components[0]),
                lastPoint = this._pointToString(linestring.components[linestring.components.length - 1]),
                removeFromDictByPoint;

            removeFromDictByPoint = function (point, dict) {
                var linestringArray,
                    index;
                if (point in dict) {
                    linestringArray = dict[point];
                    if (linestringArray.length > 1) {
                        index = null;
                        array.forEach(linestringArray, function (ls, i) {
                            if (ls.id === linestring.id) {
                                index = i;
                            }
                        });
                        if (index) linestringArray.splice(index);
                    } else {
                        delete dict[point];
                    }
                }
            };

            removeFromDictByPoint(firstPoint, pointsDict);
            removeFromDictByPoint(lastPoint, pointsDict);
        },

        _pointToString: function (point) {
            return point.x + ' ' + point.y;
        }
    });
});