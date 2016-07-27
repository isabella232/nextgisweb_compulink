define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/html',
    'dojo/dom',
    'dojo/on',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/promise/all',
    'dojo/topic',
    'dijit/focus',
    'dijit/registry',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw/settings!compulink_site',
    'ngw-compulink-site/InfoDialog',
    'dijit/Toolbar',
    'dijit/form/ToggleButton',
    'dijit/form/Button',
    'dojo/text!./templates/StatisticToolbar.html',
    'xstyle/css!./templates/css/StatisticToolbar.css'
], function (declare, lang, array, html, dom, on, query, domClass, domConstruct, all, topic, focus, registry,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             siteSettings, InfoDialog, Toolbar, ToggleButton, Button, statisticToolbarTemplate) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: statisticToolbarTemplate,
        widgetsInTemplate: true,
        region: 'top',

        constructor: function () {
        },

        postCreate: function () {
            this._bindEvents();
        },

        _bindEvents: function () {
            on(this.federalLevelButton, 'click', function() {
                topic.publish('LayerLevel/changed', 3);  //TODO: change to enum!
            });
            
            on(this.regionLevelButton, 'click', function() {
                topic.publish('LayerLevel/changed', 2);  //TODO: change to enum!
            });
            
            on(this.districtLevelButton, 'click', function() {
                topic.publish('LayerLevel/changed', 1);  //TODO: change to enum!
            });

            on(this.buildingObjectsSelect, 'change', lang.hitch(this, function() {
                if (this.buildingObjectsSelect.get('value')) {
                    var resource_id = this.buildingObjectsSelect.get('value').replace('res_', '');
                    topic.publish('ProjectFilter/changed', resource_id);
                }
            }));
            
            topic.subscribe('LayerLevel/switcher_state_changed', lang.hitch(this, function (switchersStates) {
                this.federalLevelButton.set('disabled', !switchersStates.federal.enabled);
                this.federalLevelButton.set('checked', switchersStates.federal.active);

                this.regionLevelButton.set('disabled', !switchersStates.region.enabled);
                this.regionLevelButton.set('checked', switchersStates.region.active);

                this.districtLevelButton.set('disabled', !switchersStates.district.enabled);
                this.districtLevelButton.set('checked', switchersStates.district.active);

            }));
        }
    });
});