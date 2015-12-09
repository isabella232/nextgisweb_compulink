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

        postCreate: function () {
            var domNode = this.domNode;
            this.inherited(arguments);

            jQuery(this.domNode).find('div.tree').jstree({
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

            $domNode.hover(function () {
                $treeWrapper.addClass('visible');
            });

            $domNode.focusout(function () {
               $treeWrapper.removeClass('visible');
            });
        }
    });
});
