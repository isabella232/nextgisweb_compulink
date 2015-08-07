define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/date/locale",
    "dojo/request/xhr",
    "dojo/dom-class",
    "put-selector/put",
    "ngw/route",
    "./DisplayWidget",
    // settings
    "ngw/settings!compulink_site",
    // css
    "xstyle/css!./resource/FieldsDisplayWidget.css"
], function (
    declare,
    lang,
    array,
    locale,
    xhr,
    domClass,
    put,
    route,
    DisplayWidget,
    siteSettings
) {
    var fieldsCache = {};

    return declare([DisplayWidget], {
        title: "Атрибуты",

        aliases: false,

        grid_visibility: false,

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-layer-FieldsDisplayWidget");
        },

        renderValue: function (value) {
            if (this.resourceId in fieldsCache) {
                this._render(value, fieldsCache[this.resourceId]);
            } else {
                // TODO: Тут неплохо бы было бы иметь возможность получать не весь ресурс,
                // а только нужную его часть через API. Прочем вряд ли это сейчас критично.

                xhr(route.resource.item({id: this.resourceId}), {
                    method: "GET",
                    handleAs: "json"
                }).then(lang.hitch(this, function (data) {
                    var fieldmap = {};
                    array.forEach(data.feature_layer.fields, function (itm) {
                        fieldmap[itm.keyname] = itm;
                    });

                    fieldsCache[this.resourceId] = fieldmap;
                    this._render(value, fieldmap);
                })).otherwise(console.error);
            }
        },

        _render: function (value, fieldmap) {
            var tbody = put(this.domNode, "table.pure-table.pure-table-horizontal tbody");

            for (var k in value) {
                var val = value[k];
                var field = fieldmap[k];

                if (this.compact && !fieldmap[k].grid_visibility) { continue; }


                var all_dicts = siteSettings.dicts;
                var bool_fields = siteSettings.bool_fields;

                if (all_dicts.hasOwnProperty(field.keyname)) {
                    var replace_dict = all_dicts[field.keyname];
                    if(replace_dict.hasOwnProperty(val)) val = replace_dict[val];
                }

                if (bool_fields.indexOf(field.keyname) >= 0) {
                    if (val==0)
                        val = "Нет";
                    else
                        val = "Да";
                }

                if (val === null) {
                    // pass
                } else if (field.datatype == "DATE") {
                    val = locale.format(new Date(val.year, val.month - 1, val.day), {
                        selector: "date",
                        formatLength: "medium"
                    });
                } else if (field.datatype == "TIME") {
                    val = locale.format(new Date(0, 0, 0, val.hour, val.minute, val.second), {
                        selector: "time",
                        formatLength: "medium"
                    });
                } else if (field.datatype == "DATETIME") {
                    val = locale.format(new Date(val.year, val.month - 1, val.day, val.hour, val.minute, val.second), {
                        formatLength: "medium"
                    });
                }

                if (val !== null) {
                    put(tbody, "tr th.display_name $ < td.value $", fieldmap[k].display_name, val);
                } else {
                    put(tbody, "tr th.display_name $ < td.value span.null $", fieldmap[k].display_name, "Н/Д");
                }
            }
        }
    });
});
