define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'ngw-compulink-libs/mustache/mustache'
    //'ngw-compulink-libs/jquery-1.11.2/jquery'
], function (declare, lang, topic, Deferred, xhr, jstree, mustache) {
    return declare([], {
        $resourcesTree: null,

        constructor: function (domSelector) {
            var context = this,
                $tree = this.$resourcesTree = jQuery(domSelector);
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

        _bindEvents: function ($tree) {
            //$tree.on('changed.jstree', function () {
            //    topic.publish('taxon/selected/changed', $tree.jstree('get_top_selected'));
            //});
            //
            //$tree.on('loaded.jstree', function () {
            //    $tree.jstree('open_node', 'root');
            //});
            //
            //topic.subscribe('taxon/select', lang.hitch(this, function () {
            //    this.selectTaxonNode(arguments[0]);
            //}));
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