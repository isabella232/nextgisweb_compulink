define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/on',
    'dojo/_base/array',
    'dijit/form/Select'
], function (declare, lang, topic, on, array, Select) {
    return declare([Select], {
        constructor: function (data) {
            this.options = [];
            array.forEach(data, function (dataItem) {
                this.options.push({label: dataItem[1], value: dataItem[0]})
            }, this);
        },

        get: function (name) {
            if (name === 'value') {
                return {
                    id: this.value,
                    label: this.get('displayedValue')
                };
            }
            return this.inherited(arguments);
        }
    });
});
