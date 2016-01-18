define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Evented',
    'dojo/_base/array',
    'dojo/dom-construct',
    'ngw-compulink-reporting/BuildingObjectsSelect'
], function (declare, lang, topic, Evented, array, domConstruct, BuildingObjectsSelect) {
    return declare([BuildingObjectsSelect, Evented], {
        get: function (name) {
            if (name === 'value') {
                return {
                    id: this.value.replace('res_', ''),
                    label: this.$input.val()
                };
            }
            return this.inherited(arguments);
        },

        set: function (name, id, text) {
            if (name === 'value') {
                this.value = 'res_' + id;
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
