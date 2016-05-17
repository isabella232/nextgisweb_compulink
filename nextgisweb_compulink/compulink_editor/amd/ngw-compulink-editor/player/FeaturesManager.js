define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'ngw-compulink-editor/editor/FeaturesManager'
], function (declare, lang, array, FeaturesManager) {

    return declare([FeaturesManager], {
        _featuresByBuiltDate: {},
        _minBuiltDate : 0,
        _maxBuiltDate : 0,
        _createFeatures: function (ngwFeatureItems) {
            var feature,
                editableLayerInfo,
                built_date,
                built_date_ms,
                minDate = Date.now(),
                maxDate = 0;

            this._features = {};

            array.forEach(ngwFeatureItems, function (ngwFeatures, getFeaturesPromiseIndex) {
                editableLayerInfo = this._editableLayersInfo.default[getFeaturesPromiseIndex];
                array.forEach(ngwFeatures, lang.hitch(this, function (ngwFeature) {
                    feature = this._wkt.read(ngwFeature.geom);
                    feature.attributes.keyname = editableLayerInfo.layerKeyname;
                    built_date = ngwFeature.fields.built_date;
                    feature.attributes.built_date = built_date;
                    feature.attributes.built_date = new Date(built_date.year, built_date.month, built_date.day + 1,
                        0, 0, 0);
                    built_date_ms = feature.attributes.built_date.getTime();
                    if (!this._featuresByBuiltDate.hasOwnProperty(built_date_ms)) {
                        this._featuresByBuiltDate[built_date_ms] = [];
                    }
                    this._featuresByBuiltDate[built_date_ms].push(feature);
                    if (minDate > built_date_ms) {
                        minDate = built_date_ms;
                    }
                    if (maxDate < built_date_ms) {
                        maxDate = built_date_ms;
                    }
                    feature.style = editableLayerInfo.styles;
                    feature.attributes.ngwLayerId = editableLayerInfo.id;
                    feature.attributes.ngwFeatureId = ngwFeature.id;
                    this._features[feature.attributes.ngwLayerId + '_' + feature.attributes.ngwFeatureId] = feature;
                    this.getLayer().addFeatures(feature);
                }))
            }, this);

            this._minBuiltDate = minDate;
            this._maxBuiltDate = maxDate;

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
        }
    });
});