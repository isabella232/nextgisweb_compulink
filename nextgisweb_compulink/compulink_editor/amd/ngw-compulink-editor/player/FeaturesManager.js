define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'ngw-compulink-editor/editor/FeaturesManager'
], function (declare, lang, array, FeaturesManager) {

    return declare([FeaturesManager], {
        _featuresByBuiltDate: [],
        minBuiltDate: 0,
        maxBuiltDate: 0,
        featuresCount: 0,

        _createFeatures: function (ngwFeatureItems) {
            var feature,
                editableLayerInfo,
                built_date,
                built_date_ms;

            this._features = {};

            array.forEach(ngwFeatureItems, function (ngwFeatures, getFeaturesPromiseIndex) {
                editableLayerInfo = this._editableLayersInfo.default[getFeaturesPromiseIndex];
                array.forEach(ngwFeatures, lang.hitch(this, function (ngwFeature) {
                    feature = this._wkt.read(ngwFeature.geom);
                    feature.attributes.keyname = editableLayerInfo.layerKeyname;
                    built_date = ngwFeature.fields.built_date;
                    feature.attributes.built_date = new Date(built_date.year, built_date.month, built_date.day,
                        built_date.hour, built_date.minute, built_date.second);
                    built_date_ms = feature.attributes.built_date.getTime();
                    feature.attributes.built_date_ms = built_date_ms;
                    feature.style = editableLayerInfo.styles;
                    feature.attributes.ngwLayerId = editableLayerInfo.id;
                    feature.attributes.ngwFeatureId = ngwFeature.id;
                    this._features[feature.attributes.ngwLayerId + '_' + feature.attributes.ngwFeatureId] = feature;
                    this._featuresByBuiltDate.push(feature);
                    this.getLayer().addFeatures(feature);
                }))
            }, this);

            this._sortFeaturesByBuiltDate();
            this.featuresCount = this._featuresByBuiltDate.length;
            this.minBuiltDate = this._featuresByBuiltDate[0].attributes.built_date;
            this.maxBuiltDate = this._featuresByBuiltDate[this.featuresCount - 1].attributes.built_date;

            this._modifyLayer.events.register('beforefeaturemodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._beforeFeatureModified(event);
                }));

            this._modifyLayer.events.register('afterfeaturemodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._afterFeatureModified(event);
                }));

            this._modifyLayer.events.register('featuremodified', this._modifyLayer,
                lang.hitch(this, function (event) {
                    this._modify.unselectFeature(event.feature);
                }));
        },

        _sortFeaturesByBuiltDate: function () {
            this._featuresByBuiltDate.sort(function (featureA, featureB) {
                return featureA.attributes.built_date_ms - featureB.attributes.built_date_ms;
            });
        },

        getFeaturesByBuiltDate: function () {
            return this._featuresByBuiltDate;
        }
    });
});