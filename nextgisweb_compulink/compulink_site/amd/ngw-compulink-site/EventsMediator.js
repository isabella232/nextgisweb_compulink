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

        constructor: function (Display, LayersSelector) {
            this.Display = Display;
            this.LayersSelector = Display.LayersSelector;
            this.ResourcesTypeSelector = registry.byId('resourcesTypeSelector');

            this.bindTreeTypeSelectorEvents();
        },

        bindTreeTypeSelectorEvents: function () {
            on(this.ResourcesTypeSelector, 'change', lang.hitch(this, function (selectedType) {
                this.LayersSelector.setResourceType(selectedType);
            }));
        }
    });
});