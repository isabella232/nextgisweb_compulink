define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry'
], function (declare, lang, array, topic, Deferred, xhr, on, registry) {
    return declare([], {
        constructor: function (ResourcesTree, LayersSelector, Display) {
            this.ResourcesTree = ResourcesTree;
            this.LayersSelector = LayersSelector;
            this.Display = Display;

            this.LayerTypes = {
                focl_struct: [],
                situation_plan: []
            };

            this.Resources = {
                focl_struct: [],
                situation_plan: []
            };

            this.LayersByTypes = {
                focl_struct: {},
                situation_plan: {}
            };

            this.LayersByResources = {
                focl_struct: {},
                situation_plan: {}
            };

            this.LayersOrder = {
                _layers: {},
                focl_struct: {},
                situation_plan: {}
            };

            array.forEach(this.Display.config.focl_layers_type, function (layerConfig) {
                this.LayersOrder.focl_struct[layerConfig.id] = {order: layerConfig.order, zIndexes: []};
            }, this);
            array.forEach(this.Display.config.sit_plan_layers_type, function (layerConfig) {
                this.LayersOrder.situation_plan[layerConfig.id] = {order: layerConfig.order, zIndexes: []};
            }, this);

            this.Layers = {};

            topic.subscribe('layers/type/changed', lang.hitch(this, function (inserted, deleted, resourceType) {
                var i, l, resources = [], types = [],
                    layersStackChanged = false;

                for (i = 0, l = inserted.length; i < l; i++) {
                    this.LayerTypes[resourceType].push(inserted[i]);
                    types.push(inserted[i]);
                }

                if (l > 0) {
                    resources = this.Resources.focl_struct.concat(this.Resources.situation_plan);
                    if (resources.length > 0) {

                        var resources_prepared = array.map(resources, function (resourceId) {
                            return resourceId.replace('res_', '');
                        });

                        this.getLayers(resources_prepared, types).then(lang.hitch(this, function (layers) {
                            this.addLayers(layers);
                        }));
                    }
                }

                for (i = 0, l = deleted.length; i < l; i++) {
                    var index = this.LayerTypes[resourceType].indexOf(deleted[i]);
                    if (index > -1) {
                        this.LayerTypes[resourceType].splice(index, 1);
                    }

                    var layersByTypes = this.LayersByTypes[resourceType][deleted[i]];

                    for (var uniqueLayerId in layersByTypes) {
                        layersStackChanged = true;
                        var layer = this.Layers[uniqueLayerId];

                        delete this.LayersByResources[resourceType][layer._res_id][uniqueLayerId];
                        delete this.Layers[uniqueLayerId];

                        Display.removeLayerFromMap(layer);
                        this.removeZIndex(layer);
                    }

                    this.LayersByTypes[resourceType][deleted[i]] = {};
                    if (layersStackChanged) this._applyZIndexes();
                }
            }));

            topic.subscribe('resources/changed', lang.hitch(this, function (bottom_selected, inserted, deleted) {
                var i, l,
                    resources = [], types = [],
                    node, index, layersByResources, res_type, resId, layer,
                    layersStackChanged = false;

                for (i = 0, l = inserted.length; i < l; i++) {
                    node = this.ResourcesTree.$tree.jstree('get_node', inserted[i]);
                    index = this.Resources[node.original.res_type].indexOf(inserted[i]);
                    if (index === -1) {
                        this.Resources[node.original.res_type].push(inserted[i]);
                        resources.push(inserted[i].replace('res_', ''));
                    }
                }

                if (l > 0) {
                    types = this.LayersSelector.getLayersTypesSelected();
                    if (types.length > 0) {
                        this.getLayers(resources, types).then(lang.hitch(this, function (layers) {
                            this.addLayers(layers);
                        }));
                    }
                }

                for (i = 0, l = deleted.length; i < l; i++) {
                    resId = deleted[i];
                    node = this.ResourcesTree.$tree.jstree('get_node', resId);
                    res_type = node.original.res_type;

                    index = this.Resources[res_type].indexOf(resId);
                    if (index > -1) {
                        this.Resources[res_type].splice(index, 1);
                    }

                    layersByResources = this.LayersByResources[res_type][resId.replace('res_', '')];

                    for (var uniqueLayerId in layersByResources) {
                        layer = this.Layers[uniqueLayerId];

                        delete this.Layers[uniqueLayerId];
                        delete this.LayersByTypes[res_type][layer._layer_type][uniqueLayerId];

                        Display.removeLayerFromMap(layer);
                        this.removeZIndex(layer);
                        layersStackChanged = true;
                    }
                    this.LayersByResources[res_type][resId.replace('res_', '')] = {};
                    if (layersStackChanged) this._applyZIndexes();
                }
            }));

            topic.subscribe('caclulate/resources/count', lang.hitch(this, function () {

            }));
        },

        addLayers: function (layers) {
            var layerData,
                layer,
                layerByType,
                layerByResource,
                uniqueIdLayer;

            for (var i = 0, layersCount = layers.length; i < layersCount; i++) {
                layerData = layers[i];
                layer = this.Display.appendLayerToMap(layerData.vector_id, layerData.style_id, layerData.res_type, layerData.type);
                uniqueIdLayer = layerData.vector_id + '-' + layerData.style_id;

                layerByType = this.LayersByTypes[layerData.res_type][layerData.type];
                if (!layerByType) {
                    this.LayersByTypes[layerData.res_type][layerData.type] = {};
                    layerByType = this.LayersByTypes[layerData.res_type][layerData.type];
                }

                layerByType[uniqueIdLayer] = true;

                layerByResource = this.LayersByResources[layerData.res_type][layerData.res_id];
                if (!layerByResource) {
                    this.LayersByResources[layerData.res_type][layerData.res_id] = {};
                    layerByResource = this.LayersByResources[layerData.res_type][layerData.res_id];
                }

                layerByResource[uniqueIdLayer] = true;

                layer._res_id = layerData.res_id;
                layer._layer_type = layerData.type;
                this.Layers[uniqueIdLayer] = layer;
                this.setZIndex(layer);
            }
            this._applyZIndexes();
        },

        getLayers: function (resources, types) {
            return xhr(ngwConfig.applicationUrl + '/compulink/resources/layers_by_type', {
                handleAs: 'json',
                method: 'POST',
                data: {
                    resources: resources,
                    types: types
                }
            });
        },

        calculateCountResources: function (insertedDeletedNodes) {
            var i, l,
                node, index, res_type, resId,
                inserted = insertedDeletedNodes.inserted,
                deleted = insertedDeletedNodes.deleted,
                result = {
                    'situation_plan': this.Resources.situation_plan.length,
                    'focl_struct': this.Resources.focl_struct.length
                };

            for (i = 0, l = inserted.length; i < l; i++) {
                node = this.ResourcesTree.$tree.jstree('get_node', inserted[i]);
                index = this.Resources[node.original.res_type].indexOf(inserted[i]);
                if (index === -1) {
                    result[node.original.res_type]++;
                }
            }

            for (i = 0, l = deleted.length; i < l; i++) {
                resId = deleted[i];
                node = this.ResourcesTree.$tree.jstree('get_node', resId);
                res_type = node.original.res_type;

                index = this.Resources[res_type].indexOf(resId);
                if (index > -1) {
                    result--;
                }
            }

            return result;
        },

        setZIndex: function (layer) {
            var resourceType = layer.res_type,
                layerType = layer.layer_type,
                layerOrderConfig = this.LayersOrder[resourceType][layerType],
                order = layerOrderConfig.order,
                multiplier = 100,
                countZIndexes = layerOrderConfig.zIndexes.length,
                zIndexMin = order * multiplier + 9000,
                zIndexMax = zIndexMin + multiplier + 9000,
                indexArray = 0,
                currentZIndex;

            if (countZIndexes === 0) {
                currentZIndex = zIndexMin;
            } else {
                currentZIndex = zIndexMin;
                for (; indexArray < countZIndexes; indexArray += 1) {
                    if (layerOrderConfig.zIndexes[indexArray] !== currentZIndex) {
                        layerOrderConfig.zIndexes.splice(indexArray, 0, currentZIndex);
                        return currentZIndex;
                    }
                    currentZIndex += 1;
                }
            }

            layerOrderConfig.zIndexes.push(currentZIndex);
            layer._zIndex = currentZIndex;
        },

        _applyZIndexes: function () {
            var layer_uniq_id,
                layer;

            for (layer_uniq_id in this.Layers) {
                if (this.Layers.hasOwnProperty(layer_uniq_id)) {
                    layer = this.Layers[layer_uniq_id];
                    layer.olLayer.setZIndex(layer._zIndex);
                }
            }
        },

        removeZIndex: function (layer) {
            var layerOrderConfig = this.LayersOrder[layer.res_type][layer.layer_type],
                zIndex = parseInt(layer.olLayer.getZIndex()),
                index;

            index = layerOrderConfig.zIndexes.indexOf(zIndex);

            if (index > -1) {
                layerOrderConfig.zIndexes.splice(index, 1);
            }
        }
    });
});