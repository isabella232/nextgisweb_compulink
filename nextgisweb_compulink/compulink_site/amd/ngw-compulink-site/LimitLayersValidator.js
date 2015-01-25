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
        validatorName: 'LimitLayersValidator',

        constructor: function (ResourcesTree, LayersSelector) {
            this.ResourcesTree = ResourcesTree;
            this.LayersSelector = LayersSelector;
        },

        validate: function (initiator, data) {
            switch (initiator) {
                case 'ResourcesTree':
                    return this.validateResourcesTree(data);
                    break;
                case 'LayersSelector':
                    return this.validateLayersSelector(data);
                    break;
                default:
                    console.log('LimitLayersValidator is not recognized "' + initiator + '" initiator. Returned "true".');
                    break;
            }
        },

        validateResourcesTree: function (data) {

        },

        validateLayersSelector: function (data) {

        }
    });
});