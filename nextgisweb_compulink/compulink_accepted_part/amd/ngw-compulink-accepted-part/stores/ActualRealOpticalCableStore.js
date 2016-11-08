define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'dojo/store/Memory',
    'dojox/dtl/_base',
    './_BaseStore'
], function (declare, lang, on, topic, Evented, Deferred, Memory, dtlBase, _BaseStore) {
    return declare([_BaseStore], {
        LAYER_TYPE: 'actual_real_optical_cable'
    });
});