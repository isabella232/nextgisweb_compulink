define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry',
    'ngw/openlayers'
], function (declare, lang, topic, Deferred, xhr, on, registry, openlayers) {
    return declare([], {
        settings: {},

        LayerLevels: {
            federal: 3,
            region: 2,
            district: 1
        },

        constructor: function (map) {
            this.map = map;

            //start state
            this.activeLayerLevel = this.LayerLevels.federal;
            this.selectedFederalDist = null;
            this.selectedRegion = null;
            this.selectedDistrict = null;
            this.filterResourceId = 0;

            //create layers
            this.federalLayer = new openlayers.Layer.Vector("Federal", {
                        projection: new openlayers.Projection("EPSG:3857")
                });
            this.map.addLayer(this.federalLayer);

            this.federalHighlight= new openlayers.Control.SelectFeature(this.federalLayer, {
                hover: true,
                highlightOnly: true,
                renderIntent: "temporary",
                eventListeners: {
                    beforefeaturehighlighted: this.showQtip
                }
            });
            
            this.federalSelect = new openlayers.Control.SelectFeature(this.federalLayer,
                {
                    clickout: true
                }
            );

            this.map.addControl(this.federalHighlight);
            this.map.addControl(this.federalSelect);

            this.federalHighlight.activate();
            this.federalSelect.activate();


            this.regionLayer = new openlayers.Layer.Vector("Region", {
                        projection: new openlayers.Projection("EPSG:3857"),
                        visible: false
                });
            this.map.addLayer(this.regionLayer);

            this.districtLayer = new openlayers.Layer.Vector("Districts", {
                        projection: new openlayers.Projection("EPSG:3857"),
                        visible: false
                });
            this.map.addLayer(this.districtLayer);

            //bind events
            this.bindEvents();

            //update button states
            topic.publish('LayerLevel/switcher_state_changed', this.getSwitcherState());
            
            //load federal data
            this.updateFederalLayer(true);
        },
        
             
        showQtip: function(olEvent){
            var elem = document.getElementById(olEvent.feature.geometry.id);
        
            $(elem).qtip({
                overwrite: false,
                content: olEvent.feature.attributes.name,
                show: { ready: true }
            }).qtip('show');
        },

        bindEvents: function () {
            topic.subscribe('LayerLevel/changed', lang.hitch(this, function (newLevel) {
                this.activeLayerLevel = newLevel;
                this.switchLayersVisibility(newLevel);
                topic.publish('LayerLevel/switcher_state_changed', this.getSwitcherState());
            }));
        },

        switchLayersVisibility: function(newLevel) {
            this.federalLayer.visible = newLevel==this.LayerLevels.federal;
            this.regionLayer.visible = newLevel==this.LayerLevels.region;
            this.districtLayer.visible = newLevel==this.LayerLevels.district;
        },

        getSwitcherState: function() {
            return {
                federal: {
                    enabled: true,
                    active: this.activeLayerLevel==this.LayerLevels.federal
                },
                region: {
                    enabled: this.activeLayerLevel <= this.LayerLevels.region,
                    active: this.activeLayerLevel == this.LayerLevels.region
                },
                district: {
                    enabled: this.activeLayerLevel <= this.LayerLevels.district,
                    active: this.activeLayerLevel == this.LayerLevels.district
                }
            }
        },

        federalObjectSelected: function(feat) {
            //TODO:
            // 0. start wait cursor
            // 1. Clear reg and distr layers
            // 2. Update reg data (feat)
            // 3. topic.publish('LayerLevel/changed', this.LayerLevels.region);
            // 4. End wait cursor
        },
        regionObjectSelected: function(feat) {
            //TODO:
            // 0. start wait cursor
            // 1. Clear distr layers
            // 2. Update distr data (feat)
            // 3. topic.publish('LayerLevel/changed', this.LayerLevels.district);
            // 4. End wait cursor
        },
        districtObjectSelected: function(feat) {
            //TODO:
            // 0. start wait cursor
            // 1. Update table by distr id
            // 4. End wait cursor
        },
        
        updateFederalLayer: function(zoomTo) {

            $.get( "http://127.0.0.1:6543/api/resource/496/geojson", {filterId: this.filterResourceId})
            .done(lang.hitch(this, function (data) {
                var format = new openlayers.Format.GeoJSON({ignoreExtraDims: true});
                var features = format.read(data);
                this.federalLayer.destroyFeatures();
                this.federalLayer.addFeatures(features);
                if(zoomTo) {
                    this.map.zoomToExtent(this.federalLayer.getDataExtent());
                }
            }))
            .fail(function() {
                alert( "error" );
            })
            .always(function() {
                alert( "finished" );
            });
        }
    });
});