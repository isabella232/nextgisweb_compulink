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

        },

        getYears: function () {
            return this.get('value');
        }
    });
});
