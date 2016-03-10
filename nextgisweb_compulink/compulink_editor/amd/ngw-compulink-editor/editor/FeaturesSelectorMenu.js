define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/topic',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/CheckedMenuItem',
    'dijit/MenuSeparator',
    'dijit/PopupMenuItem',
    'dojo/domReady!'
], function (declare, array, topic, Menu, MenuItem, CheckedMenuItem,
             MenuSeparator, PopupMenuItem) {
    var FEATURE_TYPES = {
        'actual_real_special_transition': 'Спецпереход',
        'actual_real_special_transition_point': 'Точка спецперехода',
        'actual_real_optical_cable': 'Трасса оптического кабеля',
        'actual_real_optical_cable_point': 'Точка трассы ОК',
        'actual_real_fosc': 'ФОСК',
        'actual_real_optical_cross': 'Оптический кросс',
        'actual_real_access_point': 'Точка доступа'
    };

    return declare([], {
        constructor: function (id, features) {
            var pMenu, label, menuItem;
            pMenu = new Menu({
                targetNodeIds: [id]
            });

            array.forEach(features, function (feature) {
                label = FEATURE_TYPES[feature.attributes.keyname];
                menuItem = new MenuItem({
                    label: label,
                    onClick: function () {
                        topic.publish('/compulink/editor/map/select', this.feature);
                    }
                });
                menuItem.feature = feature;
                pMenu.addChild(menuItem);
            }, this);

            pMenu.startup();

            pMenu._openMyself({
                target: document.getElementById('vectorIdentify')
            });
        }
    });
});