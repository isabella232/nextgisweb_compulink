define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'ngw-compulink-site/dialogs/ConfirmDialog',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'ngw-compulink-libs/mustache/mustache'
], function (declare, lang, topic, Deferred, xhr, ConfirmDialog, jstree, mustache) {
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
                'types': {
                    'types': {
                        'disabled': {
                            'check_node': false,
                            'uncheck_node': false
                        },
                        'default': {
                            'check_node': function (node) {
                                jQuery(node).children('ul').children('li').children('a').children('.jstree-checkbox').click();
                                return true;
                            },
                            'uncheck_node': function (node) {
                                jQuery(node).children('ul').children('li').children('a').children('.jstree-checkbox').click();
                                return true;
                            }
                        }
                    }
                },
                'plugins': ['checkbox', 'types']
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

            this.settings.limitCheckedNodesCount = this.settings.limitCheckedNodesCount || 1;
            this.settings.type = this.settings.type || null;
        },

        _bindEvents: function ($tree) {
            $tree.on('changed.jstree', lang.hitch(this, function (e, node) {
                this.checkSelectedBottomNodeLimit();
            }));

            topic.subscribe('resources/type/set', lang.hitch(this, function (resourceType) {
                this.settings.type = resourceType === 'all' ? null : resourceType;
                this.$resourcesTree.jstree('refresh');
            }));
        },

        checkSelectedBottomNodeLimit: function (selected_node) {
            var checkedNodesCount = this.$resourcesTree.jstree(true).get_bottom_selected().length;
            if (this.settings.limitCheckedNodesCount &&
                this.settings.limitCheckedNodesCount < checkedNodesCount) {
                // todo: add call of confirmDialog
            }
        },

        showConfirmDialog: function () {
            new ConfirmDialog({
                title: 'Внимание!',
                message: 'Может быть загружено большое количество слое - это может привести к замедлению работы.',
                buttonOk: 'Да',
                buttonCancel: 'Нет'
            }).startup().show();
        }
    });
});