define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/text!./templates/DivisionsSelect.html',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'xstyle/css!./css/DivisionsSelect.css'
], function (declare, lang, _WidgetBase, _TemplatedMixin, template) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        $domNodeTree: null,
        _selectedDivisionId: null,

        postCreate: function () {
            var domNode = this.domNode;

            this.inherited(arguments);
            this.$domNodeTree = jQuery(domNode).find('div.tree');

            this.$domNodeTree.jstree({
                'core': {
                    'data': divisions
                }
            });

            this._bindEvents();
        },

        _bindEvents: function () {
            var $domNode = jQuery(this.domNode),
                $input = $domNode.find('input'),
                $treeWrapper = $domNode.find('div.tree-wrapper');

            $input.focus(function () {
                $treeWrapper.addClass('visible');
            });

            this.$domNodeTree.on('select_node.jstree', lang.hitch(this, function (e, data) {
                var node = data.node;
                $input.val(node.text);
                this._selectedDivisionId = node.id;
            }));
        },

        getDivision: function () {
            return this._selectedDivisionId;
        }
    });
});
