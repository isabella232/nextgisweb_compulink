define([
    "dojo/_base/declare",
    "dojox/form/CheckedMultiSelect",
    "dojo/data/ObjectStore",
    "dojo/store/Memory",
    "dojo/_base/lang",
    "dojo/_base/array",
    "ngw/settings!compulink_admin",
    "xstyle/css!dojox/form/resources/CheckedMultiSelect.css"
], function (
    declare,
    CheckedMultiSelect,
    ObjectStore,
    Memory,
    lang,
    array,
    settings
) {
    return declare([CheckedMultiSelect], {

        constructor: function (params) {
            var options = array.map(settings.statuses_dict, function (itm) {
                return {
                    id: itm.id,
                    label: itm.name
                }
            });
            this.dropDown = true;
            this.multiple = true;
            this.sortByLabel = false;

            options.unshift({'id': '-', label: 'Все'});
            this.store = new ObjectStore({
                objectStore: new Memory({data: options})
            });
        },

        updateAll: function(state){
            if(this.multiple){
                array.forEach(this.options, function(i){
                    i.selected = state;
                });
                this._updateSelection();
            }
        },

        _updateSelection: function() {
            this.inherited(arguments);
            if(this.dropDown && this.dropDownButton){
                var i = 0, label = "";
                array.forEach(this.options, function(option){
                    if(option.selected && option['label'] !== 'Все'){
                        i++;
                        label = option.label;
                    }
                });
                this.dropDownButton.set("label", this.multiple ?
                    lang.replace(this._nlsResources.multiSelectLabelText, {num: i}) :
                    label);
            }
        },

        startup: function() {
            this.inherited(arguments);

            var w = this, clbck;
            array.forEach(this.dropDownMenu.getChildren(), function(child, idx) {
                if (idx == 0) {
                    clbck = function(state) { w.updateAll(state); }
                } else {
                    clbck = function(state) {
                        if (!state) { w.options[0].selected = state; }
                    }
                }
                child.onChange = clbck;
            });
        }
    });
});
