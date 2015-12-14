define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/text!./templates/DivisionsSelect.html',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'xstyle/css!./css/DivisionsSelect.css'
], function (declare, lang, topic, _WidgetBase, _TemplatedMixin, template) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        $domNodeTree: null,
        _selectedDivisionId: null,
        $input: null,

        postCreate: function () {
            var domNode = this.domNode;

            this.inherited(arguments);
            this.$domNodeTree = jQuery(domNode).find('div.tree');
            this.$input = jQuery(this.domNode).find('input');

            this.$domNodeTree.jstree({
                'core': {
                    'data': divisions,
                    'themes': {
                        'icons': false
                    }
                }
            });

            this._bindEvents();
        },

        _bindEvents: function () {
            var $domNode = jQuery(this.domNode),
                $treeWrapper = $domNode.find('div.tree-wrapper');

            this.$input.focus(function () {
                $treeWrapper.addClass('visible');
            });

            this.$input.focusout(function () {
                setTimeout(function () {
                    $treeWrapper.removeClass('visible');
                }, 1000);
            });

            this.$domNodeTree.on('select_node.jstree', lang.hitch(this, function (e, data) {
                this._selectNode(data.node);
            }));

            this.$domNodeTree.on('loaded.jstree', lang.hitch(this, function () {
                var selectedNodes = this.$domNodeTree.jstree('get_selected', true);
                this._selectNode(selectedNodes[0]);
                topic.publish('/reports/ucn/charts/init');
            }));
        },

        _selectNode: function (node) {
            this.$input.val(node.text);
            this._selectedDivisionId = node.id;
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

        getDivision: function () {
            return this._selectedDivisionId;
        }
    });
});
