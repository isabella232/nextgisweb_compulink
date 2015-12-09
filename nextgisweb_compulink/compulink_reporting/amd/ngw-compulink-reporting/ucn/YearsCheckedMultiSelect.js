define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojox/form/CheckedMultiSelect',
    'xstyle/css!./css/YearsCheckedMultiSelect.css'
], function (declare, lang, CheckedMultiSelect) {
    return declare([CheckedMultiSelect], {
        dropDown:true,
        multiple:true,
        required:false,

        postCreate: function () {

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
