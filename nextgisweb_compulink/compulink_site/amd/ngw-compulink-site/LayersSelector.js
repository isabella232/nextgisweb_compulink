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
            treesLayers: {}
        },

        constructor: function (settings) {
            lang.mixin(this.settings, settings);
        },

        buildLayersTrees: function () {
            var treeLayersConfig = this.settings.treesLayers,
                layersTypeDomId;

            for(layersTypeDomId in treeLayersConfig) {
                if (treeLayersConfig.hasOwnProperty(layersTypeDomId)) {
                    this.buildLayerTree('#' + layersTypeDomId, treeLayersConfig[layersTypeDomId]);
                }
            }
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
        }
    });
});