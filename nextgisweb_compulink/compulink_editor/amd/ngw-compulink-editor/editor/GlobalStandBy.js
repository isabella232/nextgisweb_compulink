define([
    'dojo/_base/declare',
    'dojo/query',
    'dojox/widget/Standby'
], function (declare, query, Standby) {
    if (!_instance) {
        var _instance = new Standby({
            target: query('div.main-wrapper')[0],
            id: 'globalStandBy'
        });
        document.body.appendChild(_instance.domNode);
        _instance.startup();
    }
    return _instance;
});