define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'ngw-compulink-libs/jstree-3.0.9/jstree'
], function (declare, lang, array, topic, jstree) {

    return declare('LayersSelector', [], {
        settings: {
            panelIndicatorId: 'rightPanel',
            resources: {}
        },

        $panel: null,

        constructor: function (settings) {
            lang.mixin(this.settings, settings);
            this.$panel = jQuery('#' + this.settings.panelIndicatorId);
            this.buildLayersTrees();
            this.bindEvents();
        },

        buildLayersTrees: function () {
            var resourcesTypesConfig = this.settings.resources,
                resourceType,
                $builtTree,
                selectedByDefaultNodes;

            for (resourceType in resourcesTypesConfig) {
                if (resourcesTypesConfig.hasOwnProperty(resourceType)) {
                    $builtTree = this.buildLayerTree('#' + resourcesTypesConfig[resourceType].domIdTree,
                        resourcesTypesConfig[resourceType].data,
                        resourceType);
                    if ($builtTree) {
                        resourcesTypesConfig[resourceType]['$tree'] = $builtTree;
                    }

                    if (resourcesTypesConfig[resourceType].selectedByDefault) {
                        $builtTree.on('ready.jstree', function () {
                            selectedByDefaultNodes = resourcesTypesConfig[resourceType].selectedByDefault;
                            for (var i = 0, countSelectedNodes = selectedByDefaultNodes.length; i < countSelectedNodes; i++) {
                                resourcesTypesConfig[resourceType]['$tree'].jstree('select_node', selectedByDefaultNodes[i]);
                            }
                        });
                    }
                }
            }
        },

        buildLayerTree: function (domSelector, layersTreeData, resourceType) {
            var $tree = jQuery(domSelector);

            $tree.jstree({
                'core': {
                    'dblclick_toggle': false,
                    'themes': {
                        'variant': 'small',
                        'dots': false,
                        'icons': true
                    },
                    'data': layersTreeData
                },
                'checkbox': {
                    'keep_selected_style': false
                },
                'plugins': ['checkbox']
            });

            this._bindLayersTypeChangedEvent($tree, resourceType);

            return $tree.length ? $tree : null;
        },

        _bindLayersTypeChangedEvent: function ($tree, resourceType) {
            $tree.on('loaded.jstree', lang.hitch(this, function () {
                this._saveTreeState($tree, resourceType);
            }));

            $tree.on('changed.jstree', lang.hitch(this, function (e, changed) {
                var node = changed.node,
                    inserted = [],
                    deleted = [];
                switch (changed.action) {
                    case 'select_node':
                        this._selectLayersNodeHandler($tree, resourceType, node);
                        return true;
                        break;
                    case 'deselect_node':
                        deleted = this._getInsertedDeletedNodes($tree, node, 'deselect_node', resourceType).deleted;
                        break;
                    case 'deselect_all':
                        deleted = changed.old_selection;
                        break;
                }
                this._saveTreeState($tree, resourceType);
                topic.publish('layers/type/changed', inserted, deleted, resourceType);
            }));
        },

        _selectLayersNodeHandler: function ($tree, resourceType, selected_node) {
            var validated = this._validate('LimitLayersValidator'),
                insertedNodes = this._getInsertedDeletedNodes($tree, selected_node, 'select_node', resourceType);
            if (validated) {
                validated.then(lang.hitch(this, function (result) {
                    if (result) {
                        this._saveTreeState($tree, resourceType);
                        topic.publish('layers/type/changed', insertedNodes.inserted, [], resourceType);
                    } else {
                        this._setCurrentState($tree, resourceType);
                    }
                }))
            } else {
                topic.publish('layers/type/changed', [selected_node.id], [], resourceType);
            }
        },

        _getInsertedDeletedNodes: function ($tree, node, action, resourceType) {
            var result = {
                    bottom_selected: $tree.jstree().get_bottom_selected(),
                    inserted: [],
                    deleted: []
                },
                hasChildren = (node.children && node.children.length > 0);
            switch (action) {
                case 'select_node':
                    if (hasChildren) {
                        bottom_selected_dict = {};
                        array.forEach(this._statesStorage[resourceType].core.selected, function (node_id) {
                            bottom_selected_dict[node_id] = true;
                        }, this);
                        array.forEach(node.children, function (node_id) {
                            if (!bottom_selected_dict.hasOwnProperty(node_id)) {
                                result.inserted.push(node_id);
                            }
                        });
                    } else {
                        result.inserted = [node.id];
                    }
                    break;
                case 'deselect_node':
                    if (hasChildren) {
                        bottom_selected_dict = {};
                        array.forEach(this._statesStorage[resourceType].core.selected, function (node_id) {
                            bottom_selected_dict[node_id] = true;
                        }, this);
                        array.forEach(node.children, function (node_id) {
                            if (bottom_selected_dict.hasOwnProperty(node_id)) {
                                result.deleted.push(node_id);
                            }
                        });
                    } else {
                        result.deleted = [node.id];
                    }
                    break;
            }
            return result;
        },

        bindEvents: function () {
            topic.subscribe('resources/type/set', lang.hitch(this, function (resourceType) {
                this.setResourceType(resourceType);
            }));
        },

        getLayersTypesSelected: function (type) {
            if (type) {
                return this.settings.resources[type].$tree.jstree('get_bottom_selected');
            } else {
                var result = [];
                for (var resourceType in this.settings.resources) {
                    if (this.settings.resources.hasOwnProperty(resourceType)) {
                        result = result.concat(this.settings.resources[resourceType].$tree.jstree('get_bottom_selected'));
                    }
                }
                return result;
            }
        },


        _resourceTypeFilter: 'all',
        setResourceType: function (resourceType) {
            this._resourceTypeFilter = resourceType;
            this.$panel.attr('data-resource-type-filter', resourceType);
            //this.deselectAllOther(resourceType);
        },

        deselectAllOther: function (resourceTypeSelected) {
            if (resourceType === 'all') return false;

            var resources = this.settings.resources;
            for (var resourceType in resources) {
                if (resources.hasOwnProperty(resourceType) && resourceType !== resourceTypeSelected) {
                    resources[resourceType].$tree.jstree('deselect_all');
                }
            }
        },

        getLayersSelected: function (resourceType) {
            var resourcesTypesConfig = this.settings.resources;

            if (resourcesTypesConfig[resourceType]) {
                return resourcesTypesConfig[resourceType]['$tree'].jstree('get_bottom_selected');
            } else {
                //throw 'LayersSelector: Resource type "' + resourceType '" is not found';
            }
        },

        validators: {},
        addValidator: function (validator) {
            this.validators[validator.validatorName] = validator;
            if (this.validators[validator.validatorName].bindEvents) {
                this.validators[validator.validatorName].bindEvents('LayersSelector');
            }
        },

        _validate: function (validatorName, data) {
            if (this.validators[validatorName]) {
                return this.validators[validatorName]._validate('LayersSelector', data);
            } else {
                return null;
            }
        },

        _statesStorage: {},
        _saveTreeState: function ($tree, resourceType) {
            this._statesStorage[resourceType] = $tree.jstree('get_state');
        },

        _setCurrentState: function ($tree, resourceType) {
            $tree.jstree('set_state', this._statesStorage[resourceType]);
        },

        selectLayers: function (layers, resourceType) {
            var resourcesTypesConfig = this.settings.resources;
            for (var i = 0, countSelectedNodes = layers.length; i < countSelectedNodes; i++) {
                resourcesTypesConfig[resourceType]['$tree'].jstree('select_node', layers[i]);
            }
        }
    });
});