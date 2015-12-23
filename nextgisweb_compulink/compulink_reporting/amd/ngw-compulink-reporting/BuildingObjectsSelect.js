define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/_base/array',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/text!./template/BuildingObjectsSelect.html',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'xstyle/css!./resource/BuildingObjectsSelect.css'
], function (declare, lang, topic, array, _WidgetBase, _TemplatedMixin, template) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        $domNodeTree: null,
        value: null,
        $input: null,
        $treeWrapper: null,

        postCreate: function () {
            var domNode = this.domNode;

            this.$treeWrapper = jQuery(domNode).find('div.tree-wrapper');

            this.$treeWrapper.appendTo('body');
            this.$domNodeTree = this.$treeWrapper.find('div.tree');
            this.$input = jQuery(this.domNode).find('input');

            this.$domNodeTree.jstree({
                'core': {
                    'themes': {
                        'icons': false
                    },
                    'data': {
                        'url': ngwConfig.applicationUrl + '/compulink/resources/child',
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
                'id': node.id,
                'type': 'vols'
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
                this._selectNode(data.node);
                setTimeout(function () {
                    $treeWrapper.removeClass('visible');
                }, 1000);
            }));

            this.$domNodeTree.on('loaded.jstree', lang.hitch(this, function () {
                var selectedNodes = this.$domNodeTree.jstree('get_selected', true);
                this._selectNode(selectedNodes[0]);
                topic.publish('/reports/ucn/charts/init');
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

        _selectNode: function (node) {
            if (!node || !node.text) return false;
            this.$input.val(node.text);
            this.value = node.id;
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
        }
    });
});
