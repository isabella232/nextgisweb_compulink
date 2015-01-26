define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry'
], function (declare, lang, array, topic, Deferred, xhr, on, registry) {
    return declare([], {
        constructor: function (ResourcesTree, LayersSelector) {
            this.ResourcesTree = ResourcesTree;
            this.LayersSelector = LayersSelector;

            this.LayerTypes = {
                vols: [],
                sit: []
            };

            this.Resources = {
                focl_struct: [],
                situation_plan: []
            };

            topic.subscribe('layers/type/changed', lang.hitch(this, function (inserted, deleted, resourceType) {
                var i, l, resources = [], types = [];

                for (i = 0, l = inserted.length; i < l; i++) {
                    this.LayerTypes[resourceType].push(inserted[i]);
                    types.push(inserted[i]);
                }

                if (l > 0) {
                    resources = this.Resources.focl_struct.concat(this.Resources.situation_plan);
                    if (resources.length > 0) {
                        this.getLayers(resources, types).then(function (layers) {
                            console.log(layers);
                        });
                    }
                }

                for (i = 0, l = deleted.length; i < l; i++) {
                    var index = this.LayerTypes[resourceType].indexOf(deleted[i]);
                    if (index > -1) {
                        this.LayerTypes[resourceType].splice(index, 1);
                    }
                }
            }));

            topic.subscribe('resources/changed', lang.hitch(this, function (bottom_selected, inserted, deleted) {
                var i, l, resources = [], types = [];

                for (i = 0, l = inserted.length; i < l; i++) {
                    var node = this.ResourcesTree.$tree.jstree('get_node', inserted[i]);
                    var index = this.Resources[node.original.res_type].indexOf(inserted[i]);
                    if (index === -1) {
                        this.Resources[node.original.res_type].push(inserted[i]);
                        resources.push(inserted[i].replace('res_', ''));
                    }
                }

                if (l > 0) {
                    types = this.LayersSelector.getLayersTypesSelected();
                    if (types.length > 0) {
                        this.getLayers(resources, types).then(function (layers) {
                            console.log(layers);
                        });
                    }
                }

                for (i = 0, l = deleted.length; i < l; i++) {
                    var node = this.ResourcesTree.$tree.jstree('get_node', deleted[i]);
                    var index = this.Resources[node.original.res_type].indexOf(deleted[i]);
                    if (index > -1) {
                        this.Resources[node.original.res_type].splice(index, 1);
                    }
                }


            }));
        },

        getLayers: function (resources, types) {
            return xhr(ngwConfig.applicationUrl + '/compulink/resources/layers_by_type', {
                handleAs: 'json',
                methos: 'POST',
                data: {
                    resources: resources,
                    types: types
                }
            });
        }
    });
});