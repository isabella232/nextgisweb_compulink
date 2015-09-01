define([
    "dojo/_base/declare",
    "dojox/form/CheckedMultiSelect",
    "dojo/data/ObjectStore",
    "dojo/store/Memory",
    "dojo/_base/array",
    "ngw/settings!compulink_admin",
    "xstyle/css!dojox/form/resources/CheckedMultiSelect.css"
], function (
    declare,
    CheckedMultiSelect,
    ObjectStore,
    Memory,
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
            this.store = new ObjectStore({
                objectStore: new Memory({data: options})
            });
        }
    });
});
