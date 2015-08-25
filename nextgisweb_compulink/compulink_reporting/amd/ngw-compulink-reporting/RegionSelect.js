define([
    "dojo/_base/declare",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory",
    "ngw/settings!compulink_admin"
], function (
    declare,
    FilteringSelect,
    Memory,
    settings
) {
    return declare([FilteringSelect], {

        constructor: function (params) {
            this.inherited(arguments);
            this.idProperty = 'id';
            this.searchAttr = 'name';
            this.store = new Memory({data: settings.regions_dict});
        }
    });
});
