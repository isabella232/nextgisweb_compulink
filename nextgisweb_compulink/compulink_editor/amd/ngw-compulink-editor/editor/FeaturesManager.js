define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-class',
    'dojo/Deferred',
    'dojo/promise/all',
    'dojo/query',
    'dojo/topic',
    'ngw-compulink-site/InfoDialog',
    'ngw-compulink-site/ConfirmDialog',
    'ngw/openlayers',
    'ngw-compulink-editor/editor/GlobalStandBy',
    'xstyle/css!./templates/css/FeaturesManager.css'
], function (declare, lang, array, domClass, Deferred, all, query, topic, InfoDialog,
             ConfirmDialog, openlayers, GlobalStandBy) {

    return declare([], {
        constructor: function (map, ngwServiceFacade, editorConfig, isCreateLayer, isFillObjects) {
            this._map = map;
            this._editableLayersInfo = editorConfig.editableLayersInfo;
            this._resourceId = editorConfig.resourceId;
            this._ngwServiceFacade = ngwServiceFacade;
            if (isCreateLayer) this.getLayer();
            if (isFillObjects) this.fillObjects();
            this._bindEvents();
        },

        _editableLayersInfo: null,
        _map: null,
        _ngwServiceFacade: null,
        _layer: null,
        _wkt: new openlayers.Format.WKT(),
        _modify: null,

        _getLayer: function () {
            if (this._layer) return this._layer;

            this._layer = new openlayers.Layer.Vector('FeaturesManager.Layer');
            this._map.olMap.addLayer(this._layer);
            this._map.olMap.setLayerIndex(this._layer, 9999);
            this._bindAddLayerEvent(this._map.olMap);
            this._createModify();
            this._createSnapping();
            return this._layer;
        },

        _createModify: function () {
            this._modify = new openlayers.Control.ModifyFeature(this._layer);
            this._modify.mode = openlayers.Control.ModifyFeature.RESHAPE;
            this._modify.createVertices = false;
            this._map.olMap.addControl(this._modify);
            this._modify.activate();
        },

        _createSnapping: function () {
            this._snapping = new openlayers.Control.Snapping({
                layer: this._layer,
                targets: [this._layer],
                greedy: false
            });
            this._snapping.activate();
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

            topic.subscribe('/compulink/editor/set/mode/', lang.hitch(this, function (editorMode) {
                this._setEditorMode(editorMode);
            }));

            topic.subscribe('/compulink/editor/lines/update', lang.hitch(this, function () {
                GlobalStandBy.show();
                this._ngwServiceFacade.updateEditorLines(this._resourceId).then(
                    lang.hitch(this, function () {
                        this.getLayer().destroyFeatures();
                        this.fillObjects().then(function () {
                            GlobalStandBy.hide();
                        });
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
        },

        _setEditorMode: function (editorMode) {
            if (editorMode === 'createSp' || editorMode === 'createVols') {
                this._setMapCrosshairClass();
            } else if (editorMode === 'edit') {
                this._removeMapCrosshairClass();
            }
        },

        _classCrosshair: "cursor-crosshair",
        _setMapCrosshairClass: function () {
            domClass.add(this._map.olMap.div, this._classCrosshair);
        },

        _removeMapCrosshairClass: function () {
            domClass.remove(this._map.olMap.div, this._classCrosshair);
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
            var deferred = new Deferred(),
                getFeaturesPromises = [];

            array.forEach(this._editableLayersInfo, function (editableLayerInfo) {
                getFeaturesPromises.push(this._ngwServiceFacade.getAllFeatures(editableLayerInfo.id));
            }, this);

            all(getFeaturesPromises).then(lang.hitch(this, function (ngwFeatureItems) {
                this._createFeatures(ngwFeatureItems);
                deferred.resolve();
            }));

            return deferred.promise;
        },

        _createFeatures: function (ngwFeatureItems) {
            var feature,
                editableLayerInfo;

            array.forEach(ngwFeatureItems, function (ngwFeatures, getFeaturesPromiseIndex) {
                editableLayerInfo = this._editableLayersInfo[getFeaturesPromiseIndex];
                array.forEach(ngwFeatures, lang.hitch(this, function (ngwFeature) {
                    feature = this._wkt.read(ngwFeature.geom);
                    feature.style = editableLayerInfo.style;
                    feature.ngwLayerId = editableLayerInfo.id;
                    feature.ngwFeatureId = ngwFeature.id;
                    this.getLayer().addFeatures(feature);
                }))
            }, this);

            this.getLayer().events.register('beforefeaturemodified', this.getLayer(), lang.hitch(this, function (event) {
                this._beforeFeatureModified(event);
            }));

            this.getLayer().events.register('afterfeaturemodified', this.getLayer(), lang.hitch(this, function (event) {
                this._afterFeatureModified(event);
            }));
        },

        _selectedFeature: null,
        _beforeFeatureModified: function (beforeFeatureModifiedEvent) {
            this._selectedFeature = beforeFeatureModifiedEvent.feature;
            topic.publish('/editor/feature/select', beforeFeatureModifiedEvent.feature);
        },

        _afterFeatureModified: function (afterFeatureModifiedEvent) {
            if (!afterFeatureModifiedEvent.modified) {
                return false;
            }

            var pointsAffected,
                relativeFeatures;

            var geometryId = afterFeatureModifiedEvent.feature.geometry.id;
            if (geometryId.indexOf('Point') > -1) {
                pointsAffected = this._getPointAffected(afterFeatureModifiedEvent);
            } else if (geometryId.indexOf('Line') > -1) {
                pointsAffected = this._getPointsAffectedFromLine(afterFeatureModifiedEvent);
            }

            relativeFeatures = this._processRelativeFeatures(pointsAffected);
            afterFeatureModifiedEvent.feature.modified = false;
            relativeFeatures.push(afterFeatureModifiedEvent.feature);

            this._saveFeaturesModified(relativeFeatures);
            this._unselectModifiedFeature();
        },

        _unselectModifiedFeature: function () {
            topic.publish('/editor/feature/unselect', this._selectedFeature);
            this._selectedFeature = null;
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
                    if (this.checkRelativePoint(feature.geometry.components[0], pointsAffected)) {
                        relativeFeature = feature;
                    }
                } else if (geometryId.indexOf('Line') > -1) {
                    if (this.checkRelativeLine(feature.geometry.components[0], pointsAffected)) {
                        relativeFeature = feature;
                    }
                }
                if (relativeFeature) relativeFeatures.push(relativeFeature);
            }, this);
            return relativeFeatures;
        },

        checkRelativePoint: function (point, pointsAffected) {
            var pointEqualsResult = this._pointEquals(point, pointsAffected);
            if (pointEqualsResult) {
                point.x = pointEqualsResult.current.x;
                point.y = pointEqualsResult.current.y;
                this._layer.redraw();
                return true;
            }
            return false;
        },

        checkRelativeLine: function (line, pointsAffected) {
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
                    id: feature.ngwFeatureId,
                    layer: feature.ngwLayerId
                });
            });

            this._ngwServiceFacade.saveEditorFeatures(objectsForSaving).then(null, function (result) {
                if (result.status === 'error') {
                    new InfoDialog({
                        isDestroyedAfterHiding: true,
                        title: 'Ошибка сохранения!',
                        message: result.message
                    }).show();
                }
            });
        },

        _removeFeatures: function (features) {
            var objectsForRemoving = [];
            array.forEach(features, function (feature) {
                objectsForRemoving.push({
                    id: feature.ngwFeatureId,
                    layer: feature.ngwLayerId
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
        }
    });
});