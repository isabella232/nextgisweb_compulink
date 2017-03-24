define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-class',
    'dojo/Deferred',
    'dojo/promise/all',
    'dojo/query',
    'dojo/topic',
    'dojo/keys',
    'dojo/on',
    'dojo/aspect',
    'dijit/focus',
    'dojo/_base/window',
    'ngw-compulink-site/InfoDialog',
    'ngw-compulink-site/ConfirmDialog',
    'ngw/openlayers',
    'ngw-compulink-editor/editor/ol/OpenLayers.Control.Click',
    'ngw-compulink-editor/editor/GlobalStandBy',
    'ngw-compulink-editor/editor/IdentifyLayers',
    'ngw-compulink-editor/editor/FeaturesSelectorMenu',
    'xstyle/css!./templates/css/FeaturesManager.css'
], function (declare, lang, array, domClass, Deferred, all, query, topic, keys, on, aspect, focus, win,
             InfoDialog, ConfirmDialog, openlayers, controlClick,
             GlobalStandBy, IdentifyLayers, FeaturesSelectorMenu) {

    return declare([], {
        constructor: function (map, ngwServiceFacade, editorConfig, settings) {
            this.settings = lang.mixin({}, settings);
            this._map = map;
            this._editableLayersInfo = editorConfig.editableLayersInfo;
            this._resourceId = editorConfig.resourceId;
            this._ngwServiceFacade = ngwServiceFacade;
            if (this.settings.isCreateLayer) this.getLayer();
            if (this.settings.isFillObjects) this.fillObjects();
            this._bindEvents();
            this._setEditorMode('selectAndMove');
        },

        _editableLayersInfo: null,
        _map: null,
        _ngwServiceFacade: null,
        _layer: null,
        _wkt: new openlayers.Format.WKT(),
        _modify: null,

        _notEditableStyle: {
            'stroke': true, 
            'strokeWidth': 1, 
            'fillColor': '#A9A9A9',
            'pointRadius': 5, 
            'strokeColor': '#A9A9A9', 
            'graphicZIndex': 9999, 
            'fillOpacity': 1, 
            'fill': true
        },

        _getLayer: function () {
            if (this._layer) return this._layer;

            this._layer = new openlayers.Layer.Vector('FeaturesManager.Layer', {
                rendererOptions: {zIndexing: true}
            });
            this._layer.cl_zIndex = 9999;
            this._map.olMap.addLayer(this._layer);

            this._modifyLayer = new openlayers.Layer.Vector('FeaturesManager.Modify.Layer', {
                rendererOptions: {zIndexing: true}
            });
            this._modifyLayer.cl_zIndex = 99999;
            this._map.olMap.addLayer(this._modifyLayer);

            this._bindAddLayerEvent(this._map.olMap);
            this._createClick();
            this._createModify();
            this._createSnapping();
            return this._layer;
        },

        _createModify: function () {
            this._modify = new openlayers.Control.ModifyFeature(this._modifyLayer);
            this._modify.mode = openlayers.Control.ModifyFeature.RESHAPE;
            this._modify.createVertices = false;
            this._map.olMap.addControl(this._modify);
        },

        _createSnapping: function () {
            this._snapping = new openlayers.Control.Snapping({
                layer: this._modifyLayer,
                targets: [this._layer],
                greedy: false
            });
            this._snapping.activate();
        },

        _featuresSelectorMenu: null,
        _createClick: function () {
            this._click = new controlClick({
                callback: lang.hitch(this, this._handleClick)
            });
            this._map.olMap.addControl(this._click);
        },

        _handleClick: function (e, clickEvent) {
            var lonlat = this._map.olMap.getLonLatFromPixel(clickEvent[0].xy),
                point = new openlayers.Geometry.Point(lonlat.lon, lonlat.lat),
                resolution = this._map.olMap.resolution,
                pixels = 20,
                polygonAroundPoint = openlayers.Geometry.Polygon.createRegularPolygon(point, pixels / 2 * resolution, 8, 0.0),
                featureGeometry,
                intersectedPoints = [],
                intersectedLines = [],
                countIntersectedPoints = 0,
                countIntersectedLines = 0,
                handleSelect;

            if (this._featuresSelectorMenu) {
                this._featuresSelectorMenu.close();
                this._featuresSelectorMenu = null;
            }
            this._unselectFeature();

            IdentifyLayers.showIdentify(this._map.olMap, lonlat);

            array.forEach(this._layer.features, function (feature) {
                if (feature.notEditable) {
                    return false;
                }

                featureGeometry = feature.geometry;
                if (polygonAroundPoint.intersects(featureGeometry)) {
                    if (this.isPoint(featureGeometry)) {
                        intersectedPoints.push(feature);
                        countIntersectedPoints += 1;
                    }
                    if (this.isLine(featureGeometry)) {
                        intersectedLines.push(feature);
                        countIntersectedLines += 1;
                    }
                }
            }, this);

            if (countIntersectedPoints > 0 || countIntersectedLines > 0) {
                if (countIntersectedPoints > 0) {
                    if (countIntersectedPoints === 1) {
                        this._selectFeature(intersectedPoints[0]);
                        IdentifyLayers.hideIdentify();
                    } else {
                        this._featuresSelectorMenu = new FeaturesSelectorMenu(intersectedPoints);
                        handleSelect = topic.subscribe('/compulink/editor/map/select', lang.hitch(this, function () {
                            handleSelect.remove();
                            IdentifyLayers.hideIdentify();
                        }));
                    }
                } else {
                    if (countIntersectedLines === 1) {
                        this._selectFeature(intersectedLines[0]);
                        IdentifyLayers.hideIdentify();
                    } else {
                        this._featuresSelectorMenu = new FeaturesSelectorMenu(intersectedLines);
                        handleSelect = topic.subscribe('/compulink/editor/map/select', lang.hitch(this, function () {
                            handleSelect.remove();
                            IdentifyLayers.hideIdentify();
                        }));
                    }
                }
            } else {
                this._unselectFeature();
                IdentifyLayers.hideIdentify();
            }
        },

        isLine: function (geometry) {
            return geometry.id.indexOf('Line') > -1;
        },

        isPoint: function (geometry) {
            return geometry.id.indexOf('Point') > -1;
        },

        _bindAddLayerEvent: function (map) {
            map.events.register('addlayer', map, lang.hitch(this, function () {
                this._map.olMap.setLayerIndex(this._layer, 9999);
            }));
        },

        getLayer: function () {
            return this._getLayer();
        },

        _removeConfirmDialog: null,
        _bindEvents: function () {
            topic.subscribe('/compulink/editor/features/remove', lang.hitch(this, function () {
                if (this._selectedFeature) {
                    var geometryId = this._selectedFeature.geometry.id,
                        removingFeatures;

                    removingFeatures = this._getRemovingFeatures(this._selectedFeature);

                    this._removeConfirmDialog = new ConfirmDialog({
                        title: 'Удаление объектов',
                        id: 'removeFeatures',
                        message: 'Удалить выбранный объект?',
                        buttonOk: 'Да',
                        buttonCancel: 'Отменить',
                        isDestroyedAfterHiding: true,
                        handlerOk: lang.hitch(this, function () {
                            this._removeFeatures(removingFeatures);
                            this._unselectFeature();
                        }),
                        handlerCancel: lang.hitch(this, function () {
                            this._removeConfirmDialog = null;
                        })
                    });
                    this._removeConfirmDialog.show();
                } else {
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Внимание!',
                        message: 'Выберите объект для удаления!'
                    }).show();
                }
            }));

            topic.subscribe('/compulink/editor/features/undo', lang.hitch(this, function () {
                if (this._selectedFeature) {
                    var ngwLayerId = this._selectedFeature.attributes.ngwLayerId,
                        ngwFeatureId = this._selectedFeature.attributes.ngwFeatureId;

                    this._undoOneConfirmDialog = new ConfirmDialog({
                        title: 'Отмена изменений',
                        id: 'undoOneFeature',
                        message: 'Отменить изменения выбранного объекта?',
                        buttonOk: 'Да',
                        buttonCancel: 'Отменить',
                        isDestroyedAfterHiding: true,
                        handlerOk: lang.hitch(this, function () {
                            this._undoOneFeature(ngwLayerId, ngwFeatureId);
                            this._unselectFeature();
                        }),
                        handlerCancel: lang.hitch(this, function () {
                            this._undoOneConfirmDialog = null;
                        })
                    });
                    this._undoOneConfirmDialog.show();
                } else {
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Внимание!',
                        message: 'Выберите объект для отмены изменений!'
                    }).show();
                }
            }));

            topic.subscribe('/compulink/editor/features/undo_all', lang.hitch(this, function () {
                this._undoAllConfirmDialog = new ConfirmDialog({
                    title: 'Отмена изменений',
                    id: 'undoAllFeatures',
                    message: 'Отменить изменения для всего объекта строительства?',
                    buttonOk: 'Да',
                    buttonCancel: 'Отменить',
                    isDestroyedAfterHiding: true,
                    handlerOk: lang.hitch(this, function () {
                        this._undoAllFeatures(this._resourceId);
                        this._unselectFeature();
                    }),
                    handlerCancel: lang.hitch(this, function () {
                        this._undoAllConfirmDialog = null;
                    })
                });
                this._undoAllConfirmDialog.show();
            }));

            topic.subscribe('/compulink/editor/mode/set/', lang.hitch(this, function (editorMode) {
                this._setEditorMode(editorMode);
            }));

            topic.subscribe('/compulink/editor/lines/update', lang.hitch(this, function () {
                GlobalStandBy.show();
                this._ngwServiceFacade.updateEditorLines(this._resourceId).then(
                    lang.hitch(this, function () {
                        this._updateEditorLayer(true);
                    }),
                    lang.hitch(this, function (result) {
                        GlobalStandBy.hide();
                        new InfoDialog({
                            isDestroyedAfterHiding: true,
                            title: 'Ошибка!',
                            message: result.message
                        }).show();
                    })
                );
            }));

            topic.subscribe('/editor/feature/unselect', lang.hitch(this, function (feature) {
                this._unselectFeature(feature);
            }));

            topic.subscribe('/compulink/editor/map/select', lang.hitch(this, function (feature) {
                this._selectFeature(feature);
            }));

            if (this.settings.zoomToHidingPoints) {
                this._map.olMap.events.register('zoomend', this._map.olMap,
                    lang.hitch(this, this.handlePointsVisibilityByZoom));
            }
        },

        _pointsIsVisible: null,
        setInitialPointsVisibilityState: function () {
            var zoom = this._map.olMap.getZoom();
            this._pointsIsVisible = zoom > this.settings.zoomToHidingPoints;
            if (!this._pointsIsVisible) {
                this.setPointsVisibility(false);
            }
        },

        handlePointsVisibilityByZoom: function () {
            var zoom;

            if (!this.settings.zoomToHidingPoints) {
                return false;
            }

            zoom = this._map.olMap.getZoom();

            if (zoom <= this.settings.zoomToHidingPoints && this._pointsIsVisible) {
                this.setPointsVisibility(false);
            } else if (zoom > this.settings.zoomToHidingPoints && !this._pointsIsVisible) {
                this.setPointsVisibility(true);
            }
        },

        setPointsVisibility: function (visibility) {
            array.forEach(this.getLayer().features, function (feature) {
                if (feature.attributes.keyname === 'actual_real_optical_cable_point' ||
                    feature.attributes.keyname === 'actual_real_special_transition_point') {
                    if (visibility) {
                        delete feature.style['display'];
                    } else {
                        feature.style['display'] = 'none';
                    }
                }
            }, this);
            this._pointsIsVisible = visibility;
            this.getLayer().redraw();
        },

        _selectFeature: function (feature) {
            this._unselectFeature();
            this._selectedFeature = feature;
            var clonedFeature = feature.clone();
            this._modifyLayer.addFeatures(clonedFeature);
            this._createSkecthLinesForPoint(clonedFeature);
            this._modify.activate();
            this._modify.selectFeature(clonedFeature);
        },

        _createSkecthLinesForPoint: function (targetPointFeature) {
            if (!this.isPoint(targetPointFeature.geometry)) {
                return false;
            }

            var relativeLines = [],
                geometryId,
                pointStartEqualsResult,
                pointEndEqualsResult,
                clonedFeatureRelativeLine,
                relativeVertexIndex,
                relativeVertex;

            array.forEach(this.getLayer().features, function (feature) {
                geometryId = feature.geometry.id;
                if (geometryId.indexOf('Line') > -1) {
                    pointStartEqualsResult = this._pointEquals(feature.geometry.components[0].components[0],
                        [{old: targetPointFeature.geometry.components[0]}]);
                    pointEndEqualsResult = this._pointEquals(feature.geometry.components[0].components[1],
                        [{old: targetPointFeature.geometry.components[0]}]);

                    if (pointStartEqualsResult || pointEndEqualsResult) {
                        clonedFeatureRelativeLine = feature.clone(feature);
                        this._modifyLayer.addFeatures(clonedFeatureRelativeLine);
                        relativeVertexIndex = pointStartEqualsResult ? 0 : 1;
                        relativeLines.push({
                            feature: clonedFeatureRelativeLine,
                            relativeVertex: clonedFeatureRelativeLine.geometry.components[0].components[relativeVertexIndex]
                        });
                    }
                }
            }, this);


            this._modifyLayer.events.register('vertexmodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._updateVertexSkecthLines(event.feature, relativeLines);
                }));

            return relativeLines;
        },

        _updateVertexSkecthLines: function (featurePoint, relativeLines) {
            var geometryPoint = featurePoint.geometry.components[0];
            array.forEach(relativeLines, function (line) {
                line.relativeVertex.x = geometryPoint.x;
                line.relativeVertex.y = geometryPoint.y;
                this._modifyLayer.redraw();
            }, this);
        },

        _unselectFeature: function (feature) {
            if (this._modifyLayer.features.length > 0) {
                if (this._modify.feature) {
                    this._modify.unselectFeature(this._modify.feature);
                }
                this._modify.deactivate();
                this._modifyLayer.removeAllFeatures();
                this._modifyLayer.destroyFeatures();
                this._modifyLayer.redraw();
            }

            this._selectedFeature = null;
            topic.publish('/editor/attributes/clear');
        },

        _resetSelectedStyle: function (feature) {
            var layerKeyname, style;
            if (feature && feature.attributes.keyname) {
                layerKeyname = feature.attributes.keyname;
                style = array.filter(this._editableLayersInfo.default, function (style) {
                    return style.layerKeyname == layerKeyname;
                })[0];
                feature.style = style.styles;
                feature.layer.redraw();
            }
        },

        _updateEditorLayer: function (isGlobalStandBy) {
            this.getLayer().destroyFeatures();
            this.fillObjects().then(function () {
                if (isGlobalStandBy) {
                    GlobalStandBy.hide();
                }
            });
        },

        _editorMode: 'edit',
        _setEditorMode: function (editorMode) {
            switch (editorMode) {
                case 'off':
                    this._deactivateEditMode();
                    this._deactivateCreateLineMode();
                    this._removeMapCrosshairClass();
                    break;
                case 'selectAndMove':
                    this._deactivateCreateLineMode();
                    this._activateEditMode();
                    this._removeMapCrosshairClass();
                    break;
                case 'creatingVols':
                    this._activateCreateLinesMode();
                    break;
                case 'creatingSp':
                    this._activateCreateLinesMode();
                    break;
                default:
                    throw new Exception('FeaturesManager: Unknow editor mode: "' + editorMode + '"')
            }
            this._editorMode = editorMode;
        },

        _activateCreateLinesMode: function () {
            this._deactivateEditMode();
            this._deactivateCreateLineMode();
            this._removeMapCrosshairClass();
            this._setMapCrosshairClass();
            this._activateCreateLineMode();
        },

        _classCrosshair: "cursor-crosshair",
        _setMapCrosshairClass: function () {
            domClass.add(this._map.olMap.div, this._classCrosshair);
        },

        _removeMapCrosshairClass: function () {
            domClass.remove(this._map.olMap.div, this._classCrosshair);
        },

        _activateEditMode: function () {
            this._editorMode = 'edit';
            this._click.activate();
            this._snapping.activate();
            this._activateDeleteKeyClick();
        },

        _deactivateEditMode: function () {
            this._unselectFeature();
            this._snapping.deactivate();
            this._click.deactivate();
            this._deactivateDeleteKeyClick();
        },

        _deleteKeyEvent: null,
        _activateDeleteKeyClick: function () {
            this._deleteKeyEvent = on(win.doc, 'keydown', function (evt) {
                switch (evt.keyCode) {
                    case 46:
                        if (!focus.curNode) {
                            topic.publish('/compulink/editor/features/remove');
                        }
                        break;
                }
            });
        },

        _deactivateDeleteKeyClick: function () {
            if (this._deleteKeyEvent) {
                this._deleteKeyEvent.remove();
                this._deleteKeyEvent = null;
            }
        },

        _checkClickCreateLineCallback: null,
        _activateCreateLineMode: function () {
            var context = this;
            this._checkClickCreateLineCallback = function (e) {
                context._checkClickCreateLine(e)
            };
            this.getLayer().events.register('featureclick', this.getLayer(), this._checkClickCreateLineCallback);
        },

        _deactivateCreateLineMode: function () {
            this._clearCreateLineFeatures();
            this.getLayer().events.unregister('featureclick', this.getLayer(), this._checkClickCreateLineCallback);
        },

        _clearCreateLineFeatures: function () {
            if (this._creatingLine) {
                this.getLayer().removeFeatures(this._creatingLine);
                this._creatingLine = null;
                this._startPoint = null;
            }

            if (this._mouseMoveHandler) {
                this._map.olMap.events.unregister('mousemove', this._map.olMap, this._mouseMoveHandler);
                this._mouseMoveHandler = null;
            }
        },

        _startPoint: null,
        _creatingLine: null,
        _mouseMoveHandler: null,
        _checkClickCreateLine: function (e) {
            if (e.feature.geometry.id.indexOf('Line') > -1) {
                return false;
            }

            var isStartPointExist = this._startPoint !== null;

            if (isStartPointExist &&
                this._startPoint.geometry.components[0].equals(e.feature.geometry.components[0])) {
                return false;
            }
            if (!this._verifySpPoint(e.feature)) {
                return false;
            }
            if (isStartPointExist) {
                this._createLine(e.feature);
            } else {
                this._creatingLineNow = false;
                this._createSkecthLine(e.feature);
            }
        },

        _createSkecthLine: function (startPoint) {
            this._startPoint = startPoint;
            this._creatingLine = new openlayers.Feature.Vector(new openlayers.Geometry.LineString([
                startPoint.geometry.components[0],
                startPoint.geometry.components[0].clone()
            ]));
            this.getLayer().addFeatures([this._creatingLine]);

            this._mouseMoveHandler = lang.hitch(this, function (e) {
                var lonlat = this._map.olMap.getLonLatFromPixel(e.xy),
                    endPoint = this._creatingLine.geometry.components[1];

                endPoint.x = lonlat.lon;
                endPoint.y = lonlat.lat;

                this.getLayer().redraw();
            });

            this._map.olMap.events.register('mousemove', this._map.olMap, this._mouseMoveHandler);
        },

        _creatingLineNow: false,
        _createLine: function (endPoint) {
            if (this._creatingLineNow) {
                return false;
            } else {
                this._creatingLineNow = true;
            }

            var lineInfo = {
                start: {
                    ngwLayerId: this._startPoint.attributes.ngwLayerId,
                    ngwFeatureId: this._startPoint.attributes.ngwFeatureId
                },
                end: {
                    ngwLayerId: endPoint.attributes.ngwLayerId,
                    ngwFeatureId: endPoint.attributes.ngwFeatureId
                }
            };

            switch (this._editorMode) {
                case 'creatingSp':
                    lineInfo.type = 'stp';
                    break;
                case 'creatingVols':
                    lineInfo.type = 'vols';
                    break;
                default:
                    throw new Error('Editor type "' + this._editorMode + '" is not supported.');
            }

            GlobalStandBy.show();
            this._ngwServiceFacade.createEditorLine(lineInfo).then(
                lang.hitch(this, function () {
                    this._clearCreateLineFeatures();
                    this._updateEditorLayer(true);
                }),
                lang.hitch(this, function (result) {
                    GlobalStandBy.hide();
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Ошибка!',
                        message: result ? result.message : 'На сервера произошла ошибка!'
                    }).show();
                })
            );
        },

        _pointsSp: ['actual_real_special_transition_point'],
        _verifySpPoint: function (feature) {
            if (this._editorMode !== 'creatingSp') {
                return true;
            }
            return this._pointsSp.indexOf(feature.attributes.keyname) > -1;
        },

        _getRemovingFeatures: function (feature) {
            var geometryId = feature.geometry.id,
                pointsAffected = [];

            if (geometryId.indexOf('Point') > -1) {
                pointsAffected.push(feature.geometry.components[0]);
            } else if (geometryId.indexOf('Line') > -1) {
                return [feature];
            }

            var removingFeatures = [];
            array.forEach(this.getLayer().features, function (feature) {
                var geometryId = feature.geometry.id,
                    relativeFeature = null;
                if (geometryId.indexOf('Point') > -1 && feature.geometry.components) {
                    if (this._pointSimpleEquals(feature.geometry.components[0], pointsAffected)) {
                        relativeFeature = feature;
                    }
                } else if (geometryId.indexOf('Line') > -1 && feature.geometry.components) {
                    if (this._pointSimpleEquals(feature.geometry.components[0].components[0], pointsAffected)) {
                        relativeFeature = feature;
                    }
                    if (this._pointSimpleEquals(feature.geometry.components[0].components[1], pointsAffected)) {
                        relativeFeature = feature;
                    }
                }
                if (relativeFeature) removingFeatures.push(relativeFeature);
            }, this);
            return removingFeatures;
        },

        fillObjects: function () {
            var deferred = new Deferred();

            this._fillNotEditableFeatures().then(lang.hitch(this, function (notEditableFeaturesByLayers) {
                this._fillObjects(notEditableFeaturesByLayers).then(function () {
                    deferred.resolve();
                });
            }));

            return deferred.promise;
        },

        _fillObjects: function (notEditableFeaturesByLayers) {
            var deferred = new Deferred(),
                getFeaturesPromises = [],
                notEditableExists = false;

            array.forEach(this._editableLayersInfo.default, function (editableLayerInfo) {
                getFeaturesPromises.push(this._ngwServiceFacade.getAllFeatures(editableLayerInfo.id));
            }, this);

            all(getFeaturesPromises).then(lang.hitch(this, function (ngwFeatureItems) {
                this._createFeatures(ngwFeatureItems, notEditableFeaturesByLayers);

                for (var k in notEditableFeaturesByLayers) {
                    if (notEditableFeaturesByLayers.hasOwnProperty(k)) {
                        notEditableExists = true;
                    }
                }
                if (notEditableExists) {
                    topic.publish('/compulink/panel/undo-all/disable');
                }

                if (this.settings.zoomToHidingPoints) {
                    this.setInitialPointsVisibilityState();
                }

                topic.publish('features/manager/filled', this);
                deferred.resolve();
            }));

            return deferred.promise;
        },

        _fillNotEditableFeatures: function () {
            var deferred = new Deferred(),
                layersId = [];

            array.forEach(this._editableLayersInfo.default, function (editableLayerInfo) {
                layersId.push(editableLayerInfo.id);
            }, this);

            this._ngwServiceFacade.getNotEditableFeatures(this._resourceId, layersId)
                .then(lang.hitch(this, function (notEditableFeaturesByLayers) {
                    deferred.resolve(notEditableFeaturesByLayers);
                }));

            return deferred.promise;
        },

        _features: {},
        _createFeatures: function (ngwFeatureItems, notEditableFeaturesByLayers) {
            var feature,
                editableLayerInfo,
                layerId, featureId;

            this._features = {};

            array.forEach(ngwFeatureItems, function (ngwFeatures, getFeaturesPromiseIndex) {
                editableLayerInfo = this._editableLayersInfo.default[getFeaturesPromiseIndex];
                array.forEach(ngwFeatures, lang.hitch(this, function (ngwFeature) {
                    feature = this._wkt.read(ngwFeature.geom);
                    feature.attributes.keyname = editableLayerInfo.layerKeyname;

                    layerId = editableLayerInfo.id;
                    featureId = ngwFeature.id;

                    if (notEditableFeaturesByLayers[layerId] && notEditableFeaturesByLayers[layerId][featureId]) {
                        feature.notEditable = true;
                        feature.style = this._notEditableStyle;
                    } else {
                        feature.style = editableLayerInfo.styles;
                    }

                    feature.attributes.ngwLayerId = layerId;
                    feature.attributes.ngwFeatureId = featureId;
                    this._features[layerId + '_' + featureId] = feature;
                    this.getLayer().addFeatures(feature);
                }))
            }, this);

            this._modifyLayer.events.register('beforefeaturemodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._beforeFeatureModified(event);
                }));

            this._modifyLayer.events.register('afterfeaturemodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._afterFeatureModified(event);
                }));

            this._modifyLayer.events.register('featuremodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._modify.unselectFeature(event.feature);
                }));
        },

        _selectedFeature: null,
        _beforeFeatureModified: function (beforeFeatureModifiedEvent) {
            this._applySelectStyle(beforeFeatureModifiedEvent.feature);
            topic.publish('/editor/feature/select', beforeFeatureModifiedEvent.feature);
        },

        _applySelectStyle: function (feature) {
            var keyname = feature.attributes.keyname,
                selectStyle;

            if (keyname) {
                selectStyle = this._editableLayersInfo.select[keyname];
                feature.style = selectStyle;
                this._modifyLayer.styleMap.styles.default.defaultStyle = selectStyle;
            }
        },

        _afterFeatureModified: function (afterFeatureModifiedEvent) {
            if (!afterFeatureModifiedEvent.modified) {
                return false;
            }

            var feature = afterFeatureModifiedEvent.feature,
                geometryId = feature.geometry.id,
                pointsAffected,
                relativeFeatures,
                realFeature;

            if (geometryId.indexOf('Point') > -1) {
                pointsAffected = this._getPointAffected(afterFeatureModifiedEvent);
            } else if (geometryId.indexOf('Line') > -1) {
                pointsAffected = this._getPointsAffectedFromLine(afterFeatureModifiedEvent);
            }

            realFeature = this._applyModificationToFeature(afterFeatureModifiedEvent.feature);
            relativeFeatures = this._processRelativeFeatures(pointsAffected);
            afterFeatureModifiedEvent.feature.modified = false;

            relativeFeatures.push(realFeature);

            this._saveFeaturesModified(relativeFeatures);
            this._unselectFeature();
        },

        _applyModificationToFeature: function (modifiedFeature) {
            var featureUniqueId = modifiedFeature.attributes.ngwLayerId + '_' + modifiedFeature.attributes.ngwFeatureId,
                realFeature = this._features[featureUniqueId],
                newFeature;

            newFeature = new openlayers.Feature.Vector(modifiedFeature.geometry, realFeature.attributes, realFeature.style);
            this._layer.destroyFeatures([realFeature]);
            this._layer.addFeatures(newFeature);
            this._features[featureUniqueId] = newFeature;

            this._layer.redraw();

            return newFeature;
        },

        _getPointAffected: function (afterFeatureModifiedEvent) {
            return [{
                current: afterFeatureModifiedEvent.feature.geometry.components[0],
                old: afterFeatureModifiedEvent.feature.modified.geometry.components[0]
            }];
        },

        _getPointsAffectedFromLine: function (afterFeatureModifiedEvent) {
            var pointsAffected = [],
                line = afterFeatureModifiedEvent.feature.geometry.components[0],
                oldLine = afterFeatureModifiedEvent.feature.modified.geometry.components[0];

            for (var pointIndex = 0, countPoint = 2; pointIndex < countPoint; pointIndex++) {
                if (!line.components[pointIndex].equals(oldLine.components[pointIndex])) {
                    pointsAffected.push({
                        current: line.components[pointIndex],
                        old: oldLine.components[pointIndex]
                    });
                }
            }

            return pointsAffected;
        },

        _processRelativeFeatures: function (pointsAffected) {
            var relativeFeatures = [];
            array.forEach(this.getLayer().features, function (feature) {
                var geometryId = feature.geometry.id,
                    relativeFeature = null;
                if (geometryId.indexOf('Point') > -1) {
                    if (this.redrawRelativePoint(feature.geometry.components[0], pointsAffected)) {
                        relativeFeature = feature;
                    }
                } else if (geometryId.indexOf('Line') > -1) {
                    if (this.redrawRelativeLine(feature.geometry.components[0], pointsAffected)) {
                        relativeFeature = feature;
                    }
                }
                if (relativeFeature) relativeFeatures.push(relativeFeature);
            }, this);
            return relativeFeatures;
        },

        redrawRelativePoint: function (point, pointsAffected) {
            var pointEqualsResult = this._pointEquals(point, pointsAffected);
            if (pointEqualsResult) {
                point.x = pointEqualsResult.current.x;
                point.y = pointEqualsResult.current.y;
                this._layer.redraw();
                return true;
            }
            return false;
        },

        redrawRelativeLine: function (line, pointsAffected) {
            var pointStartEqualsResult = this._pointEquals(line.components[0], pointsAffected),
                pointEndEqualsResult = this._pointEquals(line.components[1], pointsAffected),
                needRedraw = false;

            if (pointStartEqualsResult) {
                line.components[0].x = pointStartEqualsResult.current.x;
                line.components[0].y = pointStartEqualsResult.current.y;
                needRedraw = true;
            }

            if (pointEndEqualsResult) {
                line.components[1].x = pointEndEqualsResult.current.x;
                line.components[1].y = pointEndEqualsResult.current.y;
                needRedraw = true;
            }

            if (needRedraw) {
                this._layer.redraw();
                return true;
            }
            return false;
        },

        _pointSimpleEquals: function (point, pointTargetArray) {
            for (var i = 0, l = pointTargetArray.length; i < l; i++) {
                if (point.equals(pointTargetArray[i])) {
                    return pointTargetArray[i];
                }
            }
            return false;
        },

        _pointEquals: function (point, pointTargetArray) {
            for (var i = 0, l = pointTargetArray.length; i < l; i++) {
                if (point.equals(pointTargetArray[i].old)) {
                    return pointTargetArray[i];
                }
            }
            return false;
        },

        _saveFeaturesModified: function (features) {
            var objectsForSaving = [],
                wktParser = new openlayers.Format.WKT();
            array.forEach(features, function (feature) {
                objectsForSaving.push({
                    wkt: wktParser.write(feature),
                    id: feature.attributes.ngwFeatureId,
                    layer: feature.attributes.ngwLayerId
                });
            });

            this._ngwServiceFacade.saveEditorFeatures(objectsForSaving).then(null, function (result) {
                var message = result.status === 'error' ? result.message :
                    'На сервере произошла ошибка. Перезагрузите страницу';

                new InfoDialog({
                    isDestroyedAfterHiding: true,
                    title: 'Ошибка сохранения!',
                    message: message
                }).show();
            });
        },

        _removeFeatures: function (features) {
            var objectsForRemoving = [];
            array.forEach(features, function (feature) {
                objectsForRemoving.push({
                    id: feature.attributes.ngwFeatureId,
                    layer: feature.attributes.ngwLayerId
                });

            });

            this._modify.unselectFeature();
            this.getLayer().removeFeatures(features);

            this._ngwServiceFacade.removeFeatures(objectsForRemoving).then(null, function (result) {
                if (result.status === 'error') {
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Ошибка сохранения!',
                        message: result.message
                    }).show();
                }
            });
        },

        _undoOneFeature: function (ngwLayerId, ngwFeatureId) {
            GlobalStandBy.show();
            this._ngwServiceFacade.resetFeature(ngwLayerId, ngwFeatureId).then(
                lang.hitch(this, function () {
                    this._updateEditorLayer(true);
                }),
                lang.hitch(this, function (result) {
                    GlobalStandBy.hide();
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Ошибка!',
                        message: result.message
                    }).show();
                })
            );
        },

        _undoAllFeatures: function (resourceId) {
            GlobalStandBy.show();
            this._ngwServiceFacade.resetLayers(resourceId).then(
                lang.hitch(this, function () {
                    this._updateEditorLayer(true);
                }),
                lang.hitch(this, function (result) {
                    GlobalStandBy.hide();
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Ошибка!',
                        message: result.message
                    }).show();
                })
            );
        }
    });
});