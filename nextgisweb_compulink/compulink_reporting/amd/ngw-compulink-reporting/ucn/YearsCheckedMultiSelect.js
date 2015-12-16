define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/on',
    'dojox/form/CheckedMultiSelect',
    'xstyle/css!dojox/form/resources/CheckedMultiSelect.css'
], function (declare, lang, array, domConstruct, on, CheckedMultiSelect) {
    return declare([CheckedMultiSelect], {
        dropDown: true,
        multiple: true,
        required: false,
        templateFromTo: '{from} - {to}',
        templateSingleValue: '{value}',

        postCreate: function () {
            this._bindEvents();
        },

        _bindEvents: function () {
            this.on('change', function (e) {
                console.log('change');
            });
        },

        getYears: function () {
            return this.get('value');
        },

        _updateSelection: function () {
            this._handleOnChange(this.value);
            array.forEach(this._getChildren(), function (item) {
                item._updateBox();
            });
            domConstruct.empty(this.containerNode);
            var self = this,
                template, labels = [];
            array.forEach(this.value, function (item) {
                var opt = domConstruct.create('option', {
                    'value': item,
                    'label': item,
                    'selected': 'selected'
                });
                domConstruct.place(opt, self.containerNode);
            });
            if (this.dropDown && this.dropDownButton) {
                var i = 0, label = '';
                array.forEach(this.options, function (option) {
                    if (option.selected) {
                        i++;
                        label = option.label;
                        labels.push(label);
                    }
                });

                if (i === 0) {
                    template = 'Период не установлен';
                } else if (i > 0) {
                    template = labels.join(',');
                }

                this.dropDownButton.set('label', this.multiple ?
                    template :
                    label);
            }
        }
    });
});
