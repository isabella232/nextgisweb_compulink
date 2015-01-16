define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry'
], function (declare, lang, topic, Deferred, xhr, on, registry) {
    return declare([], {
        settings: {},

        constructor: function (Display) {
            this.Display = Display;
            this.TreeTypeSelector = {
                dropdown: registry.byId('treeTypeSelectorDropDown'),
                menu: registry.byId('treeTypeSelectorMenu')
            };
            this.bindTreeTypeSelectorEvents();
        },

        bindTreeTypeSelectorEvents: function () {
            on(this.TreeTypeSelector.dropdown.dropDown, 'onclick', lang.hitch(this, function (newValue) {
                console.log(newValue);
            }));
        }
    });
});