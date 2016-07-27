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
            this.filterResourceId = 'root';

            //create layers
            this.federalLayer = new openlayers.Layer.Vector("Federal", {
                        projection: new openlayers.Projection("EPSG:3857"),
                        styleMap: this.getAreaStyle(),
                        eventListeners: {
                             'featureselected': lang.hitch(this, this.routeFeatureSelect)
                        }
                });
            this.map.addLayer(this.federalLayer);

            this.regionLayer = new openlayers.Layer.Vector("Region", {
                        projection: new openlayers.Projection("EPSG:3857"),
                        styleMap: this.getAreaStyle(),
                        eventListeners: {
                             'featureselected': lang.hitch(this, this.routeFeatureSelect)
                        },
                        visible: false
                });
            this.map.addLayer(this.regionLayer);

            this.districtLayer = new openlayers.Layer.Vector("Districts", {
                        projection: new openlayers.Projection("EPSG:3857"),
                        styleMap: this.getAreaStyle(),
                        eventListeners: {
                             'featureselected': lang.hitch(this, this.routeFeatureSelect)
                        },
                        visible: false
                });
            this.map.addLayer(this.districtLayer);

            //select controls
            this.highlightCtrl= new openlayers.Control.SelectFeature(
                [this.federalLayer, this.regionLayer, this.districtLayer],
                {
                    hover: true,
                    highlightOnly: true,
                    renderIntent: "temporary"
                    // ,eventListeners: {
                    //     beforefeaturehighlighted: this.showQtip
                    // }
            });

            this.selectCtrl = new openlayers.Control.SelectFeature(
                [this.federalLayer, this.regionLayer, this.districtLayer],
                {clickout: true}
            );

            this.map.addControl(this.highlightCtrl);
            this.map.addControl(this.selectCtrl);

            this.highlightCtrl.activate();
            this.selectCtrl.activate();


            //bind events
            this.bindEvents();

            //update button states
            topic.publish('LayerLevel/switcher_state_changed', this.getSwitcherState());
            
            //load federal data
            this.updateFederalLayer(true);
        },
        
             
        showQtip: function(olEvent){
            var elem = document.getElementById(olEvent.feature.geometry.components[0].id);
        
            $(elem).qtip({
                overwrite: true,
                content: olEvent.feature.attributes.name,
                show: { ready: true },
                position: {
                    my: "top center",
                    at: "center center"
                }
            }).qtip('show');
        },

        bindEvents: function () {
            topic.subscribe('LayerLevel/changed', lang.hitch(this, function (newLevel) {
                //clear table
                topic.publish('resources/changed', []);

                this.activeLayerLevel = newLevel;
                this.switchLayersVisibility(newLevel);
                topic.publish('LayerLevel/switcher_state_changed', this.getSwitcherState());
            }));
        },

        switchLayersVisibility: function(newLevel) {
            this.federalLayer.setVisibility(newLevel==this.LayerLevels.federal);
            this.regionLayer.setVisibility(newLevel==this.LayerLevels.region);
            this.districtLayer.setVisibility(newLevel==this.LayerLevels.district);
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


        routeFeatureSelect: function(olEvent) {
            //zoom to
            this.map.zoomToExtent(olEvent.feature.geometry.bounds);
            //clear table
            topic.publish('resources/changed', []);
            //exec handler
            if(olEvent.feature.layer===this.federalLayer) this.federalObjectSelected(olEvent.feature);
            if(olEvent.feature.layer===this.regionLayer) this.regionObjectSelected(olEvent.feature);
            if(olEvent.feature.layer===this.districtLayer) this.districtObjectSelected(olEvent.feature);
            //deselect all
            this.selectCtrl.unselectAll();
        },
        federalObjectSelected: function(feat) {
            // 0. start wait cursor
            this.regionLayer.destroyFeatures();
            this.districtLayer.destroyFeatures();
            this.selectedFederalDist = feat.attributes.fed_id;
            this.updateRegionLayer();
            topic.publish('LayerLevel/changed', this.LayerLevels.region);
            // 4. End wait cursor
        },
        regionObjectSelected: function(feat) {
            // 0. start wait cursor
            this.districtLayer.destroyFeatures();
            this.selectedRegion = feat.attributes.reg_id;
            this.updateDistrictLayer();
            topic.publish('LayerLevel/changed', this.LayerLevels.district);
            // 4. End wait cursor
        },
        districtObjectSelected: function(feat) {
            // 0. start wait cursor
            this.selectedDistrict = feat.attributes.dist_id;
            this.updateConstructObjectTable();
            // 4. End wait cursor
        },
        
        updateFederalLayer: function(zoomTo) {
            $.get( "/compulink/statistic_map/get_federal_districts_layer", {project_filter: this.filterResourceId})
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
            })
            .always(function() {
            });
        },

        updateRegionLayer: function(zoomTo) {
            $.get( "/compulink/statistic_map/get_regions_layer", {project_filter: this.filterResourceId, fed_id: this.selectedFederalDist})
            .done(lang.hitch(this, function (data) {
                var format = new openlayers.Format.GeoJSON({ignoreExtraDims: true});
                var features = format.read(data);
                this.regionLayer.destroyFeatures();
                this.regionLayer.addFeatures(features);
                if(zoomTo) {
                    this.map.zoomToExtent(this.regionLayer.getDataExtent());
                }
            }))
            .fail(function() {
            })
            .always(function() {
            });
        },

        updateDistrictLayer: function(zoomTo) {
            $.get( "/compulink/statistic_map/get_district_layer", {project_filter: this.filterResourceId, reg_id: this.selectedRegion})
            .done(lang.hitch(this, function (data) {
                var format = new openlayers.Format.GeoJSON({ignoreExtraDims: true});
                var features = format.read(data);
                this.districtLayer.destroyFeatures();
                this.districtLayer.addFeatures(features);
                if(zoomTo) {
                    this.map.zoomToExtent(this.districtLayer.getDataExtent());
                }
            }))
            .fail(function() {
            })
            .always(function() {
            });
        },

        updateConstructObjectTable: function() {
            $.get( "/compulink/statistic_map/get_district_co", {project_filter: this.filterResourceId, dist_id: this.selectedDistrict})
            .done(lang.hitch(this, function (data) {
                var co_res = [];
                for (var i=0; i<data.length; i++) { co_res.push('res_' + data[i]); }  //ugly hack
                topic.publish('resources/changed', co_res);
            }))
            .fail(function() {
            })
            .always(function() {
            });
        },

        getAreaStyle: function() {
            var defaultStyle = new OpenLayers.Style({
                'fillColor': '${color}',
                'strokeColor': '#A0A0A0', //${color}',
                'strokeWidth': 0.6,
                'fillOpacity': 0.4
                //, 'label' : "${short_name}",
                // 'fontColor': 'black',
                // 'labelOutlineColor': 'white'
            });

            var selectStyle = new OpenLayers.Style({
                'pointRadius': 20
            });

            var highlightStyle = new OpenLayers.Style({
                'pointRadius': 20
            });

            var styleMap = new OpenLayers.StyleMap({
                'default': defaultStyle
                // ,
                // 'select': selectStyle,
                // 'temporary': highlightStyle
            });

            return styleMap;
        }
    });
});