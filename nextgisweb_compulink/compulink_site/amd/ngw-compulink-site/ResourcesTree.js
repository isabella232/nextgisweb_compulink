define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/aspect',
    'ngw-compulink-libs/jstree-3.0.9/jstree'
], function (declare, lang, array, topic, Deferred, xhr, aspect, jstree) {
    return declare([], {
        $tree: null,
        settings: {},
        validators: {},

        constructor: function (domSelector, settings) {
            var context = this,
                $tree = this.$tree = jQuery(domSelector);

            this.setDefaultValues(settings);

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
            this._bindEvents($tree);
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

        _bindEvents: function ($tree) {
            var node;

            $tree.on('changed.jstree', lang.hitch(this, function (e, changed) {
                if (changed.action === 'deselect_all') {
                    return false;
                }
                node = changed.node;
                if (node.original.has_children) {
                    if ($tree.jstree('is_loaded', node)) {
                        this._fireTriggerChanged(node.children, changed.action);
                    } else {
                        $tree.jstree('load_all', node, lang.hitch(this, function (parent_node) {
                            this._fireTriggerChanged(parent_node.children, changed.action);
                        }));
                    }
                } else {
                    this._fireTriggerChanged(node.id, changed.action);
                }
            }));

            //this.$tree.on('load_node.jstree', lang.hitch(this, function (e, loaded) {
            //    if (loaded.node.id === '#') {
            //        this._bindClickChildNodesEvents(loaded.node, 'root');
            //    }
            //}));
            //
            //this.$tree.on('after_open.jstree', lang.hitch(this, function (e, opened) {
            //    this._bindClickChildNodesEvents(opened.node, 'after_open');
            //}));

            $tree.on('refresh.jstree', lang.hitch(this, function () {
                this._checkedResourcesId = this.$tree.jstree().get_bottom_selected();
            }));

            topic.subscribe('resources/type/set', lang.hitch(this, function (resourceType) {
                this.settings.type = resourceType === 'all' ? null : resourceType;
                this.$tree.jstree('refresh');
            }));
        },

        addValidator: function (validator) {
            this.validators[validator.validatorName] = validator;
            if (this.validators[validator.validatorName].bindEvents) {
                this.validators[validator.validatorName].bindEvents('ResourcesTree');
            }
        },

        _bindClickChildNodesEvents: function (parentNode, initiator) {
            if (parentNode.click) {
                return false;
            }
            var $nodes;
            if (initiator === 'root') {
                $nodes = array.map(parentNode.children, function (id) {
                    return '#' + id + ' a:not(.jstree-disabled)';
                });
                $nodes = jQuery($nodes.join(','));
            } else if (initiator === 'after_open') {
                $nodes = jQuery('#' + parentNode.id + ' ul li a:not(.jstree-disabled)');
            } else if (initiator === 'click') {
                $nodes = null;
            }

            this._checkStatesNodes($nodes, parentNode);
            parentNode.click = true;
        },

        _checkStatesNodes: function ($nodes, parentNode) {

            if ($nodes === null && parentNode.state.loaded === false && parentNode.original.has_children === true) {
                this.$tree.jstree('open_node', parentNode);
            }

            if (!parentNode.click && !parentNode.state.disabled) {
                this._bindClickNodesEvents(parentNode);
                parentNode.click = true;
            }


        },

        _bindClickNodesEvents: function ($nodes) {
            var $tree, node;
            $nodes.on('click', lang.hitch(this, function (e) {
                $tree = this.$tree;
                node = $tree.jstree('get_node', jQuery(e.currentTarget).parent().attr('id'));
                console.log(node);
                e.stopPropagation();


                if (this.validators['LimitLayersValidator']) {
                    this.validators['LimitLayersValidator'].validate('ResourcesTree', {
                        node: node,
                        $tree: $tree
                    });
                }

            }));
        },

        _checkedResourcesId: [],
        _fireTriggerChanged: function () {
            topic.publish('resources/changed', this.$tree.jstree().get_bottom_selected(), null, null);
        }
    });
});