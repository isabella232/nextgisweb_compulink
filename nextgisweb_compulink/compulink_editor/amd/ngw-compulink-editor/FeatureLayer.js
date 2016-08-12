define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'ngw-compulink-site/plugin/FeatureLayer'
], function (
    declare,
    lang,
    array,
    FeatureLayer
) {
    return declare([FeatureLayer], {
        _turnIdentifyByDefault: false
    });
});
