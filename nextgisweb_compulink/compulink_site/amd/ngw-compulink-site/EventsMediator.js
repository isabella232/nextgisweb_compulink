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
            this.ResourcesTypeSelector = registry.byId('resourcesTypeSelector');

            this.bindTreeTypeSelectorEvents();
        },

        bindTreeTypeSelectorEvents: function () {
            on(this.ResourcesTypeSelector, 'change', lang.hitch(this, function (newValue) {
                console.log(newValue);
            }));
        }
    });
});