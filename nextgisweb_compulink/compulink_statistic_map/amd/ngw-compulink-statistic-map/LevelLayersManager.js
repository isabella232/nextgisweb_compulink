define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'ngw/route',
    'dijit/registry',
    'ngw/openlayers'
], function (declare, lang, array, topic, Deferred, xhr, on, route, registry, openlayers) {
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
                    ,eventListeners: {
                        beforefeaturehighlighted: this.showQtip //.showTooltip //showQtip
                    }
            });

            this.selectCtrl = new openlayers.Control.SelectFeature(
                [this.federalLayer, this.regionLayer, this.districtLayer],
                {clickout: true}
            );

            this.map.addControl(this.highlightCtrl);
            this.map.addControl(this.selectCtrl);

            this.highlightCtrl.activate();
            this.selectCtrl.activate();

            //drag map workaround
            if (typeof(this.highlightCtrl.handlers) != "undefined") { // OL 2.7
                this.highlightCtrl.handlers.feature.stopDown = false;
            } else if (typeof(this.highlightCtrl.handler) != "undefined") { // OL < 2.7
                this.highlightCtrl.handler.stopDown = false;
                this.highlightCtrl.handler.stopUp = false;
            }
            if (typeof(this.selectCtrl.handlers) != "undefined") { // OL 2.7
                this.selectCtrl.handlers.feature.stopDown = false;
            } else if (typeof(this.selectCtrl.handler) != "undefined") { // OL < 2.7
                this.selectCtrl.handler.stopDown = false;
                this.selectCtrl.handler.stopUp = false;
            }

            //bind events
            this.bindEvents();

            //update button states
            topic.publish('LayerLevel/switcher_state_changed', this.getSwitcherState());
            
            //load federal data
            this.updateFederalLayer(true);
        },
        
        tooltips: [],

        showQtip: function(olEvent){
            //$('.qtip.ui-tooltip').qtip('hide');
            $(".qtip").qtip('hide'); //.remove();

            var elem = document.getElementById(olEvent.feature.geometry.components[0].id);

            // var targets = $(elem);
            // var segments = olEvent.feature.geometry.components;
            // array.forEach(segments, function (segment) {
            //     targets.add( document.getElementById(targets.push(segment.id)) );
            // });

            $(elem).qtip({
                overwrite: true,
                content: olEvent.feature.attributes.name,
                //show: { ready: true },
                position: {
                    my: "center center",
                    at: "center center"
                },
                hide: {
                    //target: targets, //$('[id^=OpenLayers_Geometry_Polygon_]'),
                    inactive: 2000
                },
                style: {
                   classes: 'qtip-blue qtip-shadow qtip-rounded'
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

            topic.subscribe('ProjectFilter/changed', lang.hitch(this, function (res_id) {
                //clear table
                topic.publish('resources/changed', []);

                this.filterResourceId = res_id;

                if(this.activeLayerLevel==this.LayerLevels.federal) {
                    this.updateFederalLayer();
                }
                if(this.activeLayerLevel==this.LayerLevels.region) {
                    // TODO: double map standby!
                    this.updateFederalLayer();
                    this.updateRegionLayer();
                }
                if(this.activeLayerLevel==this.LayerLevels.district) {
                    this.updateFederalLayer();
                    this.updateRegionLayer();
                    this.updateDistrictLayer();
                }
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
            if(olEvent.feature.layer!=this.districtLayer)
                this.map.zoomToExtent(olEvent.feature.geometry.bounds);
            //clear table
            topic.publish('resources/changed', []);
            //exec handler
            if(olEvent.feature.layer===this.federalLayer) this.federalObjectSelected(olEvent.feature);
            if(olEvent.feature.layer===this.regionLayer) this.regionObjectSelected(olEvent.feature);
            if(olEvent.feature.layer===this.districtLayer) this.districtObjectSelected(olEvent.feature);
            //deselect all
            if(olEvent.feature.layer!=this.districtLayer)
                this.selectCtrl.unselectAll();
        },
        federalObjectSelected: function(feat) {
            this.regionLayer.destroyFeatures();
            this.districtLayer.destroyFeatures();
            this.selectedFederalDist = feat.attributes.fed_id;
            this.updateRegionLayer();
            topic.publish('LayerLevel/changed', this.LayerLevels.region);
        },
        regionObjectSelected: function(feat) {
            this.districtLayer.destroyFeatures();
            this.selectedRegion = feat.attributes.reg_id;
            this.updateDistrictLayer();
            this.updateConstructObjectTable();
            topic.publish('LayerLevel/changed', this.LayerLevels.district);
        },
        districtObjectSelected: function(feat) {
            this.selectedDistrict = feat.attributes.dist_id;
            this.updateConstructObjectTable();
        },
        
        updateFederalLayer: function(zoomTo) {
           topic.publish('map/mode/standby');
            $.get(route.compulink.statistic_map.get_federal_districts_layer(), {project_filter: this.filterResourceId})
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
                topic.publish('map/mode/normal');
            });
        },

        updateRegionLayer: function(zoomTo) {
           topic.publish('map/mode/standby');
            $.get(route.compulink.statistic_map.get_regions_layer(), {project_filter: this.filterResourceId, fed_id: this.selectedFederalDist})
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
                topic.publish('map/mode/normal');
            });
        },

        updateDistrictLayer: function(zoomTo) {
            topic.publish('map/mode/standby');
            $.get(route.compulink.statistic_map.get_district_layer(), {project_filter: this.filterResourceId, reg_id: this.selectedRegion})
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
                topic.publish('map/mode/normal');
            });
        },

        updateConstructObjectTable: function() {
            var url, params;

            if(this.activeLayerLevel == this.LayerLevels.region) {
                url = route.compulink.statistic_map.get_region_co();
                params = {project_filter: this.filterResourceId, reg_id: this.selectedRegion}
            }
            if(this.activeLayerLevel == this.LayerLevels.district) {
                url = route.compulink.statistic_map.get_district_co();
                params = {project_filter: this.filterResourceId, dist_id: this.selectedDistrict}
            }

            $.get( url, params)
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
                'strokeColor': '#6D6D6D', //${color}',
                'strokeWidth': 0.9,
                'fillOpacity': 0.4
                //, 'label' : "${short_name}",
                // 'fontColor': 'black',
                // 'labelOutlineColor': 'white'
            });

            var selectStyle = new OpenLayers.Style({
            });

            var highlightStyle = new OpenLayers.Style({
                'fillColor': '${color}',
                'fillOpacity': 0.6,
                'strokeWidth': 2,
                'strokeColor': '#66CCCC'
            });

            var styleMap = new OpenLayers.StyleMap({
                'default': defaultStyle,
                // 'select': selectStyle,
                'temporary': highlightStyle
            });

            return styleMap;
        }
    });
});