define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-compulink-libs/jstree-3.0.9/jstree',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/LayersTreeSelector.html'
], function (declare, lang, topic, Deferred, xhr,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             jstree, mustache, LayersTreeSelectorTemplate) {

    return declare('LayersTreeSelector', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        settings: {
            treesLayers: {}
        },
        widgetsInTemplate: true,
        templateString: LayersTreeSelectorTemplate,

        _stringRepl: function (tmpl) {
            return mustache.render(tmpl, this);
        },

        constructor: function (settings) {
            lang.mixin(this.settings, settings);
        },

        postCreate: function () {
            this.inherited(arguments);
            this.buildLayersTrees();
        },

        buildLayersTrees: function () {
            var treeLayersConfig = this.settings.treesLayers,
                layersTypeDomId;

            for(layersTypeDomId in treeLayersConfig) {
                if (treeLayersConfig.hasOwnProperty(layersTypeDomId)) {
                    this.buildLayerTree(layersTypeDomId, treeLayersConfig[layersTypeDomId]);
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