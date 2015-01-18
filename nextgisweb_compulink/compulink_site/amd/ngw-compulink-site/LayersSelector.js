define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'ngw-compulink-libs/jstree-3.0.9/jstree'
], function (declare, lang, topic, Deferred, xhr,
             jstree) {

    return declare('LayersSelector', [], {
        settings: {
            panelIndicatorId: 'rightPanel',
            resources: {}
        },

        $panel: null,

        constructor: function (settings) {
            lang.mixin(this.settings, settings);
            this.$panel = jQuery('#' + this.settings.panelIndicatorId);
            this.buildLayersTrees();
        },

        buildLayersTrees: function () {
            var resourcesTypesConfig = this.settings.resources,
                resourceType,
                $builtTree;

            for(resourceType in resourcesTypesConfig) {
                if (resourcesTypesConfig.hasOwnProperty(resourceType)) {
                    $builtTree = this.buildLayerTree('#' + resourcesTypesConfig[resourceType].domIdTree, resourcesTypesConfig[resourceType].data);
                    if ($builtTree) {
                        resourcesTypesConfig[resourceType]['$tree'] = $builtTree;
                    }
                }
            }
        },

        _resourceTypeFilter: 'all',
        setResourceType: function (resourceType) {
            this.$panel.attr('data-resource-type-filter', resourceType);
        },

        buildLayerTree: function (domSelector, layersTreeData) {
            var $tree = jQuery(domSelector);

            $tree.jstree({
                'core': {
                    'themes': {
                        'variant': 'small',
                        'dots': false,
                        'icons': false
                    },
                    'data': layersTreeData
                },
                'checkbox': {
                    'keep_selected_style': false
                },
                'plugins': ['checkbox']
            });

            return $tree.length ? $tree : null;
        }
    });
});