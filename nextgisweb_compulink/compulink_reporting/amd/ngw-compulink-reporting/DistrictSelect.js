define([
    "dojo/_base/declare",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory"
], function (
    declare,
    FilteringSelect,
    Memory
) {
    return declare([FilteringSelect], {

        constructor: function (params) {
            this.inherited(arguments);
            this.idProperty = 'id';
            this.searchAttr = 'name';
            this.store = new Memory({data: params.districts});
        }
    });
});
