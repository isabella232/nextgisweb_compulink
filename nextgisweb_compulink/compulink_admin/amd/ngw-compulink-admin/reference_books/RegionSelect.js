define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Evented',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/text!./templates/RegionSelect.html',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'xstyle/css!./styles/RegionSelect.css'
], function (declare, lang, topic, Evented, domConstruct, array, _WidgetBase, _TemplatedMixin, template) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        $domNodeTree: null,
        value: {
            region_id: null,
            district_id: null
        },
        $input: null,
        $treeWrapper: null,
        getResourcesUrl: null,

        constructor: function (params) {
            this.getResourcesUrl = ngwConfig.applicationUrl + params.url;
        },

        postCreate: function () {
            var domNode = this.domNode;

            this.$treeWrapper = jQuery(domNode).find('div.districts-tree-wrapper');

            this.$treeWrapper.appendTo('body');
            this.$domNodeTree = this.$treeWrapper.find('div.tree');
            this.$input = jQuery(this.domNode).find('input');

            this.$domNodeTree.jstree({
                'core': {
                    'themes': {
                        'icons': false
                    },
                    'data': {
                        'url': this.getResourcesUrl,
                        'data': lang.hitch(this, function (node) {
                            return this._getJsTreeQuery(node);
                        }),
                        success: function (data) {
                            array.forEach(data, function (item) {
                                if (item.state && item.state.disabled) {
                                    item.state.disabled = false;
                                }
                            });
                            return data;
                        },
                        dataType: 'json'
                    },
                    'strings': {
                        'Loading ...': 'Загружается...'
                    }
                }
            });

            this._bindEvents();
        },

        _getJsTreeQuery: function (node) {
            return {
                'id': node.id
            };
        },

        _bindEvents: function () {
            var $domNode = jQuery(this.domNode),
                $buttonArrow = $domNode.find('div.dijitArrowButton'),
                $treeWrapper = this.$treeWrapper;

            this.$input.focus(lang.hitch(this, function () {
                this._renderTreeWrapper();
                $treeWrapper.addClass('visible');
            }));

            this.$input.focusout(function () {
                setTimeout(function () {
                    $treeWrapper.removeClass('visible');
                }, 1000);
            });

            $buttonArrow.click(lang.hitch(this, function () {
                $treeWrapper.toggleClass('visible');
                if ($treeWrapper.hasClass('visible')) {
                    this._renderTreeWrapper();
                }
            }));

            this.$domNodeTree.on('select_node.jstree', lang.hitch(this, function (e, data) {
                this._selectNode(data.node, this.$domNodeTree);
                setTimeout(lang.hitch(this, function () {
                    $treeWrapper.removeClass('visible');
                    this.emit('blur', {});
                }), 1000);
            }));

            this.$domNodeTree.on('loaded.jstree', lang.hitch(this, function () {
                var selectedNodes = this.$domNodeTree.jstree('get_selected', true);
                this._selectNode(selectedNodes[0]);
            }));
        },

        _renderTreeWrapper: function () {
            var inputPosition = this.$input.offset(),
                heightInput = this.$input.outerHeight();

            this.$treeWrapper.css({
                top: inputPosition.top + heightInput + 1,
                left: inputPosition.left,
                position: 'absolute'
            });
        },

        _selectNode: function (node, $tree) {
            if (!node || !node.text) return false;

            var parent_node;

            if (node.parent === '#') {
                this.$input.val(node.text);
                this.value.region_id = node.id;
                this.value.district_id = null;
            } else {
                parent_node = $tree.jstree(true).get_node(node.parent);
                this.$input.val(parent_node.text + ', ' + node.text);
                this.value.region_id = parent_node.id;
                this.value.district_id = node.id;
            }
        },

        _showTree: function ($treeWrapper) {
            var htmlClick, $treeWrapperClick;

            $treeWrapper.addClass('visible');

            htmlClick = $('html').on('click', function () {
                $treeWrapper.removeClass('visible');
                $('html').off(htmlClick);
                $treeWrapper.off($treeWrapperClick);
            });

            $treeWrapperClick = $treeWrapper.on('click', function (event) {
                event.stopPropagation();
            });
        },

        get: function (name) {
            var result = {};
            if (name === 'value') {
                result['full'] = true;
                lang.mixin(result, this.value);
                return result;
            }
            return this.inherited(arguments);
        },

        set: function (name, text, object) {
            if (name === 'value') {
                this.value = {
                    region_id: object.region_id,
                    district_id: object.district_id
                };

                this.$input.val(text);
            } else {
                this.inherited(arguments);
            }
        },


        destroyRecursive: function () {
            domConstruct.destroy(this.domNode);
        }
    });
});
