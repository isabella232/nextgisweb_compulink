define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry',
    'ngw-compulink-site/JsTreeValidationConfirmDialog'
], function (declare, lang, array, topic, Deferred, xhr, on, registry, JsTreeValidationConfirmDialog) {
    return declare([], {
        settings: {},
        validatorName: 'LimitLayersValidator',

        constructor: function (ResourcesTree, LayersSelector, LayersManager, limit) {
            this.ResourcesTree = ResourcesTree;
            this.LayersSelector = LayersSelector;
            this.LayersManager = LayersManager;
            this.limit = limit || 200;
        },

        _validate: function (initiator, data) {

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
            var deferred = new Deferred(),
                resourceType,
                resourcesSelected = this.LayersManager.calculateCountResources(data),
                layersTypeSelected = {
                    situation_plan: this.LayersSelector.getLayersSelected('situation_plan'),
                    focl_struct: this.LayersSelector.getLayersSelected('focl_struct')
                },
                count = 0;

            for (resourceType in resourcesSelected) {
                if (resourcesSelected.hasOwnProperty(resourceType)) {
                    count += resourcesSelected[resourceType] * layersTypeSelected[resourceType].length;
                }
            }

            console.log(count);
            if (count > this.limit) {
                this.showConfirmDialog(function () {
                    deferred.resolve(true);
                }, function () {
                    deferred.resolve(false);
                });
                return deferred.promise;
            } else {
                deferred.resolve(true);
                return deferred;
            }
        },

        validateLayersSelector: function (data) {

        },

        bindEvents: function (initiator) {
            switch (initiator) {
                case 'ResourcesTree':
                    return this.bindEventsResourcesTree();
                    break;
                case 'LayersSelector':
                    return this.bindEventsLayersSelector();
                    break;
                default:
                    console.log('LimitLayersValidator is not recognized "' + initiator + '" initiator. Returned "true".');
                    break;
            }
        },

        bindEventsResourcesTree: function () {

        },

        validateSelectedBottomNodeLimit: function () {
            var checkedNodesCount = this.$tree.jstree(true).get_bottom_selected().length;
            if (this.settings.limitCheckedNodesCount &&
                this.settings.limitCheckedNodesCount < checkedNodesCount) {
                this.showConfirmDialog();
                return false;
            } else {
                return true;
            }
        },

        showConfirmDialog: function (handlerOk, handlerCancel) {
            JsTreeValidationConfirmDialog.config({
                handlerOk: handlerOk,
                handlerCancel: handlerCancel
            }).show();
        }
    });
});