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
                        'data': function (node) {
                            return {'id': node.id};
                        },
                        success: function (data) {
                            //context.createHtmlNodes(data);
                            return data;
                        },
                        dataType: 'json'
                    }
                },
                'checkbox': {
                    'keep_selected_style': false
                },
                'plugins': ['wholerow', 'checkbox']
            });
            this._bindEvents($tree);
        },

        setDefaultValues: function (settings) {
            lang.mixin(this.settings, settings);

            if (!this.settings.limitCheckedNodesCount) {
                this.settings.limitCheckedNodesCount = 1;
            }
        },

        _bindEvents: function ($tree) {
            $tree.on('changed.jstree', lang.hitch(this, function (e, node) {
                this.checkSelectedBottomNodeLimit();
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
        },

        createHtmlNodes: function (data) {
            var taxonItem;

            for (var i = 0, countTaxons = data.length; i < countTaxons; i++) {
                taxonItem = data[i];
                if (taxonItem.is_specie && taxonItem.author) {
                    taxonItem.text = mustache.render(this.specieNodeTemplate, {
                        name: taxonItem.text,
                        author: taxonItem.author
                    });
                }
            }
        },

        selectTaxonNode: function (taxonId) {
            var tree = this.$resourcesTree,
                getPath = xhr(application_root + '/taxon/path/' + taxonId, {
                    handleAs: 'json'
                }),
                deferred = new Deferred();

            if (tree.jstree('is_loaded', taxonId)) {

            }

            getPath.then(lang.hitch(this, function (data) {
                this._expandBranchByHierarchy(data.path, data.path.length, deferred);
            }));

            return deferred.promise;
        },

        _expandBranchByHierarchy: function (hierarchyPathArray, hierarchyDepth, deferred) {
            var tree = this.$resourcesTree,
                node = tree.jstree('get_node', hierarchyPathArray[0]);

            if (hierarchyDepth === 1) {
                if (!node.state.selected) {
                    tree.jstree('select_node', node);
                }
                this._focusToNode(node);
                deferred.resolve();
                return true;
            }

            if (node.state.loaded) {
                hierarchyDepth = this._decreaseHierarchyArray(hierarchyPathArray, hierarchyDepth);
                this._expandBranchByHierarchy(hierarchyPathArray, hierarchyDepth, deferred);
            } else {
                tree.jstree('load_node', node.id, lang.hitch(this, function (data) {
                    hierarchyDepth = this._decreaseHierarchyArray(hierarchyPathArray, hierarchyDepth);
                    this._expandBranchByHierarchy(hierarchyPathArray, hierarchyDepth, deferred);
                }));
            }
        },

        _decreaseHierarchyArray: function (hierarchyPathArray, hierarchyDepth) {
            hierarchyPathArray.splice(0, 1);
            return hierarchyDepth - 1;
        },

        _focusToNode: function (node) {
            var $tree = this.$resourcesTree,
                $treeOffsetTop = $tree.offset().top,
                scrollToTop,
                $treeContainer = $tree.parent(),
                $node = jQuery('#' + node.id),
                $nodeOffsetTop = $node.offset().top,
                abs = Math.abs;

            if ($treeOffsetTop < 0 && $nodeOffsetTop > 0) {
                scrollToTop = abs($treeOffsetTop) + $nodeOffsetTop;
            } else if ($treeOffsetTop > 0 && $nodeOffsetTop > 0) {
                scrollToTop = $nodeOffsetTop - $treeOffsetTop;
            } else if ($treeOffsetTop < 0 && $nodeOffsetTop < 0) {
                scrollToTop = abs($treeOffsetTop) - abs($nodeOffsetTop);
            }

            $treeContainer.scrollTop(scrollToTop - $treeContainer.height() / 2);
        }
    });
});