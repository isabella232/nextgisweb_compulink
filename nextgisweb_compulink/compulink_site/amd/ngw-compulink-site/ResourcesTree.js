define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/aspect',
    'ngw-compulink-libs/jstree-3.0.9/jstree'
], function (declare, lang, array, topic, Deferred, xhr,
             aspect, jstree) {
    return declare([], {
        $tree: null,
        settings: {},
        validators: {},

        constructor: function (domSelector, settings) {
            var context = this,
                $tree = this.$tree = jQuery(domSelector);

            this.setDefaultValues(settings);

            this._bindEvents($tree);

            $tree.jstree({
                'core': {
                    'themes': {
                        'variant': 'small'
                    },
                    'data': {
                        'url': ngwConfig.applicationUrl + '/compulink/resources/child',
                        'data': lang.hitch(this, function (node) {
                            return this._getJsTreeQuery(node);
                        }),
                        success: function (data) {
                            return data;
                        },
                        dataType: 'json'
                    },
                    'strings': {
                        'Loading ...': 'Загружается...'
                    }
                },
                'checkbox': {
                    'keep_selected_style': false,
                    'two_state': true
                },
                'plugins': ['checkbox', 'types', 'ui']
            });

        },

        _getJsTreeQuery: function (node) {
            var query;
            query = {'id': node.id};

            if (this.settings.type) {
                query.type = this.settings.type;
            }

            return query;
        },

        setDefaultValues: function (settings) {
            lang.mixin(this.settings, settings);

            this.settings.limitCheckedNodesCount = this.settings.limitCheckedNodesCount || null;
            this.settings.type = this.settings.type || null;
        },

        _previousState: null,
        _bindEvents: function ($tree) {
            var node,
                insertedDeletedNodes;

            $tree.on('changed.jstree', lang.hitch(this, function (e, changed) {

                if (this._setting_state) {
                    return false;
                }

                if (changed.action === 'deselect_all') {
                    this._previousState = this.$tree.jstree('get_state');
                    return false;
                }

                node = changed.node;

                if (node.original.res_type === 'resource_group') {
                    this._onClickResourceGroup(node.original, changed);
                    return true;
                }

                if (node.original.has_children) {
                    if ($tree.jstree('is_loaded', node)) {
                        insertedDeletedNodes = this._getInsertedDeletedNodes(node.children, changed.action);
                        var validated = this._validate('LimitLayersValidator', insertedDeletedNodes);
                        if (validated) {
                            validated.then(lang.hitch(this, function (result) {
                                if (result) {
                                    this._previousState = this.$tree.jstree('get_state');
                                    this._fireTriggerChanged(node.children, changed.action);
                                } else {
                                    this._set_previous_state();
                                }
                            }))
                        } else {
                            this._fireTriggerChanged(node.children, changed.action);
                        }
                    } else {
                        $tree.jstree('load_all', node, lang.hitch(this, function (parent_node) {
                            var loaded_node = node;
                            this.$tree.on('after_open.jstree', lang.hitch(this, function (e, parent_node) {
                                insertedDeletedNodes = this._getInsertedDeletedNodes(parent_node.node.children, changed.action);

                                var validated = this._validate('LimitLayersValidator', insertedDeletedNodes);
                                if (validated) {
                                    validated.then(lang.hitch(this, function (result) {
                                        if (result) {
                                            this._previousState = this.$tree.jstree('get_state');
                                            this._fireTriggerChanged(parent_node.node.children, changed.action);
                                        } else {
                                            this._set_previous_state();
                                        }
                                    }))
                                } else {
                                    this._fireTriggerChanged(parent_node.node.children, changed.action);
                                }

                                this.$tree.off('after_open.jstree');
                            }));

                            $tree.jstree('open_node', node);

                        }));

                    }
                } else {
                    this._previousState = this.$tree.jstree('get_state');
                    this._fireTriggerChanged(node.id, changed.action);
                }
            }));

            this.$tree.on('loaded.jstree', lang.hitch(this, function () {
                if (!this.settings.resourceToSelect) {
                    this._previousState = this.$tree.jstree('get_state');
                }
            }));

            $tree.on('refresh.jstree', lang.hitch(this, function () {
                this._checkedResourcesId = this.$tree.jstree().get_bottom_selected();
                topic.publish('resources/tree/refreshed');
            }));

            topic.subscribe('resources/type/set', lang.hitch(this, function (resourceType) {
                this.settings.type = resourceType === 'all' ? null : resourceType;
                this.$tree.jstree('refresh');
            }));

            topic.subscribe('resources/tree/refresh', lang.hitch(this, function () {
                this.$tree.jstree('refresh');
            }));
        },

        _onClickResourceGroup: function (node, changed) {
            var insertedDeletedNodes;
            this.$tree.jstree('load_all', node, lang.hitch(this, function (parentNode) {
                insertedDeletedNodes = this._getGroupInsertedDeletedNodes(parentNode, changed.action);
                var validated = this._validate('LimitLayersValidator', insertedDeletedNodes);
                if (validated) {
                    validated.then(lang.hitch(this, function (result) {
                        if (result) {
                            this._previousState = this.$tree.jstree('get_state');
                            topic.publish('resources/changed', insertedDeletedNodes.bottom_selected, insertedDeletedNodes.inserted, insertedDeletedNodes.deleted);
                        } else {
                            this._set_previous_state();
                        }
                    }))
                } else {
                    topic.publish('resources/changed', insertedDeletedNodes.bottom_selected, insertedDeletedNodes.inserted, insertedDeletedNodes.deleted);
                }
            }));
        },

        _getGroupInsertedDeletedNodes: function (parentNode, action) {
            var childrenNodesId,
                result = {
                bottom_selected: this.$tree.jstree().get_bottom_selected(),
                inserted: [],
                deleted: []
            };

            childrenNodesId = this._getSelectedChildrenForNode(parentNode, result.bottom_selected);

            switch (action) {
                case 'select_node':
                    result.inserted = childrenNodesId;
                    break;
                case 'deselect_node':
                    result.deleted = this._getDeselectedNodesForGroup(parentNode);
                    break;
            }
            return result;
        },

        _getDeselectedNodesForGroup: function (parentNode) {
            var childrens = parentNode.children_d,
                deselectedNodes = [],
                node;

            array.forEach(childrens, lang.hitch(this, function (nodeId) {
                node = this.$tree.jstree('get_node', nodeId);

                if (!node.original.has_children) {
                    deselectedNodes.push(node.id);
                }
            }));

            return deselectedNodes;
        },

        _getSelectedChildrenForNode: function (node, bottomSelected) {
            var nodes = [],
                bottomSelectedNode;

            array.forEach(bottomSelected, lang.hitch(this, function (nodeId) {
                bottomSelectedNode = this.$tree.jstree('get_node', nodeId);
                if (this._isChild(bottomSelectedNode, node)) {
                    nodes.push(nodeId);
                }
            }));

            return nodes;
        },

        _isChild: function (node, parentNode) {
            var parentNodeId = parentNode.id,
                isChild = false;

            array.some(node.parents, function (parentId) {
                if (parentId === parentNodeId) {
                    isChild = true;
                    return true;
                }
            });

            return isChild;
        },

        selectResource: function () {
            var getParentsUrl = ngwConfig.applicationUrl +
                '/compulink/resources/' + this.settings.resourceToSelect + '/get_focl_parents';
            xhr(getParentsUrl, {
                handleAs: "json"
            }).then(lang.hitch(this, function (parents) {
                parents.shift();
                this._parentsToOpen = array.map(parents, function (resId) {
                    return 'res_' + resId;
                });
                this.open_node();
            }));
        },

        _parentsToOpen: null,
        open_node: function () {
            if (!this._parentsToOpen[0]) {
                this.$tree.jstree('select_node', 'res_' + this.settings.resourceToSelect);
                return true;
            }
            var after_open = lang.hitch(this, function () {
                this._parentsToOpen.shift();
                this.$tree.off('after_open.jstree', after_open);
                this.open_node();
            });
            this.$tree.on('after_open.jstree', after_open);
            this.$tree.jstree('open_node', this._parentsToOpen[0]);
        },

        addValidator: function (validator) {
            this.validators[validator.validatorName] = validator;
            if (this.validators[validator.validatorName].bindEvents) {
                this.validators[validator.validatorName].bindEvents('ResourcesTree');
            }
        },

        _validate: function (validatorName, data) {
            if (this.validators[validatorName]) {
                return this.validators[validatorName]._validate('ResourcesTree', data);
            } else {
                return null;
            }
        },

        _fireTriggerChanged: function (nodesId, action) {
            var insertedDeletedNodes = this._getInsertedDeletedNodes(nodesId, action);
            topic.publish('resources/changed', insertedDeletedNodes.bottom_selected, insertedDeletedNodes.inserted, insertedDeletedNodes.deleted);
        },

        _getInsertedDeletedNodes: function (nodesId, action) {
            var result = {
                bottom_selected: this.$tree.jstree().get_bottom_selected(),
                inserted: [],
                deleted: []
            };
            switch (action) {
                case 'select_node':
                    if (nodesId.constructor === Array) {
                        result.inserted = nodesId;
                    } else {
                        result.inserted.push(nodesId);
                    }
                    break;
                case 'deselect_node':
                    if (nodesId.constructor === Array) {
                        result.deleted = nodesId;
                    } else {
                        result.deleted.push(nodesId);
                    }
                    break;
            }
            return result;
        },

        _setting_state: false,
        _set_previous_state: function () {
            this.$tree.on('set_state.jstree', lang.hitch(this, function () {
                this._setting_state = false;
                this._previousState = this.$tree.jstree('get_state');
                this.$tree.off('set_state.jstree');
            }));

            this._setting_state = true;
            this.$tree.jstree('set_state', this._previousState);
        }
    });
});