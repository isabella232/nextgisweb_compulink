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
        constructor: function (ResourcesTree, LayersSelector, Display, layerInOne) {
            this.ResourcesTree = ResourcesTree;
            this.LayersSelector = LayersSelector;
            this.Display = Display;
            this.layerInOne = typeof layerInOne != 'undefined' ? layerInOne : true;

            this.LayerTypes = {
                focl_struct: [],
                situation_plan: []
            };

            this.Resources = {
                focl_struct: [],
                situation_plan: []
            };

            this.LayersByTypes = {};
            this.LayersByVectorId = {};

            this.LayersByResources = {
                focl_struct: {},
                situation_plan: {}
            };

            this.LayersConfig = {};

            array.forEach(this.Display.config.focl_layers_type, function (layerConfig) {
                if (layerConfig.children && layerConfig.children.length > 0) {
                    array.forEach(layerConfig.children, function (layerConfigChild) {
                        this.LayersConfig[layerConfigChild.id] = {
                            order: layerConfigChild.order,
                            text: layerConfigChild.text,
                            identify_text: layerConfigChild.identify_text
                        };
                    }, this);
                }
            }, this);
            array.forEach(this.Display.config.sit_plan_layers_type, function (layerConfig) {
                this.LayersConfig[layerConfig.id] =  {
                            order: layerConfig.order,
                            text: layerConfig.text,
                            identify_text: layerConfig.identify_text
                        };
            }, this);

            this.Layers = {};

            topic.subscribe('layers/type/changed', lang.hitch(this, function (inserted, deleted, resourceType) {
                var i, l, resources = [], types = [],
                    layersStackChanged = false;

                for (i = 0, l = inserted.length; i < l; i++) {
                    types.push(inserted[i]);
                }

                if (l > 0) {
                    resources = this.Resources.focl_struct.concat(this.Resources.situation_plan);
                    if (resources.length > 0) {
                        var resources_prepared = array.map(resources, function (resourceId) {
                            return resourceId.replace('res_', '');
                        });

                        for (var typesInsertedCount = types.length, typeIndex = 0; typeIndex < typesInsertedCount; typeIndex++) {
                            var layerType = types[typeIndex];
                            this.getLayers(resources_prepared, layerType).then(lang.hitch(this, function (layers) {
                                this.rebuildLayers(layers);
                            }));
                        }
                    }
                }

                for (i = 0, l = deleted.length; i < l; i++) {
                    if (this.LayersByTypes[deleted[i]]) {
                        var layer = this.LayersByTypes[deleted[i]];
                        var layerVectorIds = layer.vectors_ids.split(',');
                        array.forEach(layerVectorIds, function (vectorId) {
                            delete this.LayersByVectorId[vectorId];
                        }, this);
                        Display.removeLayerFromMap(layer);
                        //this.removeZIndex(layer);
                        delete this.LayersByTypes[deleted[i]];
                        layersStackChanged = true;
                    }
                }
                //if (layersStackChanged) this.applyZIndexes();
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

                for (i = 0, l = deleted.length; i < l; i++) {
                    resId = deleted[i];
                    node = this.ResourcesTree.$tree.jstree('get_node', resId);
                    res_type = node.original.res_type;

                    index = this.Resources[res_type].indexOf(resId);
                    if (index > -1) {
                        this.Resources[res_type].splice(index, 1);
                    }
                }


                types = this.LayersSelector.getLayersTypesSelected();
                resources = this.Resources.focl_struct.concat(this.Resources.situation_plan);
                if (resources.length > 0) {
                    var resources_prepared = array.map(resources, function (resourceId) {
                        return resourceId.replace('res_', '');
                    });
                    for (var typesCount = types.length, typeIndex = 0; typeIndex < typesCount; typeIndex++) {
                        var type = types[typeIndex];
                        this.getLayers(resources_prepared, type).then(lang.hitch(this, function (layers) {
                            this.rebuildLayers(layers);
                        }));
                    }
                } else {
                    this.clearLayers();
                }

                //this.applyZIndexes();

            }));

            topic.subscribe('caclulate/resources/count', lang.hitch(this, function () {

            }));
        },

        rebuildLayers: function (layers) {
            var layerData,
                layer,
                i, layerType,
                layersCount = layers.length,
                stylesIds = [],
                vectorIds = [],
                layerVectorIds;

            if (layersCount > 0) {
                layerType = layers[0].type;
            } else {
                return false;
            }

            for (i = 0, layersCount; i < layersCount; i++) {
                layerData = layers[i];
                if (layerData.type !== layerType) {
                    console.log('Mutable layers types: ' + layerType + ', ' + layerData.type);
                }

                stylesIds.push(layerData.style_id);
                vectorIds.push(layerData.vector_id);
            }

            if (this.LayersByTypes[layerType]) {
                layer = this.LayersByTypes[layerType];
                layerVectorIds = layer.vectors_ids.split(',');
                array.forEach(layerVectorIds, function (vectorId) {
                    delete this.LayersByVectorId[vectorId];
                }, this);
                this.Display.removeLayerFromMap(layer);
                //this.removeZIndex(this.LayersByTypes[layerType]);
                delete this.LayersByTypes[layerType];
            }

            layer = this.Display.appendLayersToMapInOne(vectorIds, stylesIds, layerType);

            this.LayersByTypes[layerType] = layer;

            array.forEach(vectorIds, function (vectorId){
                this.LayersByVectorId[vectorId] = layer;
            }, this);

            layer._layer_type = layerData.type;
            this.setZIndex(layer);
            this.applyZIndexes();
        },

        clearLayers: function () {
            for (var layerType in this.LayersByTypes) {
                if (this.LayersByTypes.hasOwnProperty(layerType) &&
                    this.LayersByTypes[layerType]) {
                    this.Display.removeLayerFromMap(this.LayersByTypes[layerType]);
                    delete this.LayersByTypes[layerType];
                }
            }
            this.LayersByVectorId = {};
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
            var layerType = layer.layer_type,
                layerOrderConfig = this.LayersConfig[layerType],
                order = layerOrderConfig.order,
                multiplier = 1000,
                countZIndexes,
                zIndexMin = order * multiplier + 1000,
                zIndexMax = zIndexMin + multiplier + 1000,
                indexArray = 0,
                currentZIndex;

            if (!layerOrderConfig.zIndexes) {
                layerOrderConfig.zIndexes = [];
                countZIndexes = 0;
            } else {
                countZIndexes = layerOrderConfig.zIndexes.length;
            }

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

        applyZIndexes: function () {
            var layerVectorId,
                layersByVectorId = this.LayersByVectorId,
                layer;

            for (layerVectorId in layersByVectorId) {
                if (layersByVectorId.hasOwnProperty(layerVectorId)) {
                    layer = layersByVectorId[layerVectorId];
                    layer.olLayer.setZIndex(layer._zIndex);
                }
            }
        },

        removeZIndex: function (layer) {
            var layerOrderConfig = this.LayersConfig[layer.res_type][layer.layer_type],
                zIndex = parseInt(layer.olLayer.getZIndex()),
                index;

            index = layerOrderConfig.zIndexes.indexOf(zIndex);

            if (index > -1) {
                layerOrderConfig.zIndexes.splice(index, 1);
            }
        }
    });
});