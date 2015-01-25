define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/aspect',
    'ngw-compulink-site/JsTreeValidationConfirmDialog',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'ngw-compulink-libs/mustache/mustache'
], function (declare, lang, topic, Deferred, xhr, aspect, JsTreeValidationConfirmDialog, jstree) {
    return declare([], {
        $resourcesTree: null,
        settings: {},

        constructor: function (domSelector, settings) {
            var context = this,
                $tree = this.$resourcesTree = jQuery(domSelector);

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

                if (this.validateSelectedBottomNodeLimit()) {

                }
            }));

            //$tree.on('before_open.jstree', function (e, loaded) {
            //    if (loaded.node.id === '#') {
            //
            //    } else {
            //        var c = jQuery('#' + loaded.node.id + ' ul li a').on('click', function (e) {
            //            console.log(e);
            //            e.stopPropagation();
            //        });
            //        console.log(c);
            //    }
            //});

            $tree.on('refresh.jstree', lang.hitch(this, function () {
                this._checkedResourcesId = this.$tree.jstree().get_bottom_selected();
            }));

            topic.subscribe('resources/type/set', lang.hitch(this, function (resourceType) {
                this.settings.type = resourceType === 'all' ? null : resourceType;
                this.$resourcesTree.jstree('refresh');
            }));
        },



        validateSelectedBottomNodeLimit: function () {
            var checkedNodesCount = this.$resourcesTree.jstree(true).get_bottom_selected().length;
            if (this.settings.limitCheckedNodesCount && this.settings.limitCheckedNodesCount < checkedNodesCount) {
                this.showConfirmDialog();
                return false;
            } else {
                return true;
            }
        },

        showConfirmDialog: function () {
            JsTreeValidationConfirmDialog.show();
        },

        _checkedResourcesId: [],
        _fireTriggerChanged: function () {
            topic.publish('resources/changed', this.$resourcesTree.jstree().get_bottom_selected(), null, null);
        }
    });
});