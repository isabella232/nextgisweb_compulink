define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/ValidationTextBox",
    "dijit/form/NumberTextBox",
    "dijit/form/FilteringSelect",
    "dijit/form/DateTextBox",
    "dojo/store/Memory",
    "dojo/dom",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/FoclStructWidget.html",
    "ngw/settings!compulink_admin",
    // template
    "ngw/form/UploaderList"
], function (
    declare,
    lang,
    array,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ValidationTextBox,
    NumberTextBox,
    FilteringSelect,
    DateTextBox,
    Memory,
    dom,
    serialize,
    template,
    settings
) {
    console.log(settings);

    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Объект строительства",
        serializePrefix: "focl_struct",

        postCreate: function () {
            this.inherited(arguments);

            if (settings.regions_dict.length > 0)
                regions_ds = new Memory({data: settings.regions_dict});
            else
                regions_ds = new Memory();

            if (settings.districts_dict.length > 0)
                districts_ds = new Memory({data: settings.districts_dict});
            else
                districts_ds = new Memory();

            statuses_ds = new Memory({data: settings.statuses_dict});

            //set data store
            this.regions_cmb.store = regions_ds;
            this.district_cmb.store = districts_ds;
            this.status_cmb.store = statuses_ds;

            //set signals/slots
            this.regions_cmb.onChange = lang.hitch(this, function (selection) {

                //set limit for data source
                this.district_cmb.query.parent_id = this.regions_cmb.item.id;

                //try to restore value for distr cmb
                if (this.district_cmb.item !== undefined) {
                    var old_item_id = this.district_cmb.item.id;
                    var res = districts_ds.query({parent_id: this.regions_cmb.item.id, id: old_item_id});

                    if (res.length > 0) {
                        this.district_cmb.set("value", this.district_cmb.store.getIdentity(res[0]));
                        return;
                    }
                }

                //else set first
                var res = districts_ds.query({parent_id: this.regions_cmb.item.id})
                this.district_cmb.set("value", this.district_cmb.store.getIdentity(res[0]));
            });

            //set def values
            if (settings.regions_dict.length > 0)
                this.regions_cmb.set("value", regions_ds.getIdentity(regions_ds.data[0]));

            this.status_cmb.set("value", settings.def_status);
        },


         serializeInMixin: function (data) {
             if (data.focl_struct === undefined) {
                 data.focl_struct = {};
             }
         }

    });
});