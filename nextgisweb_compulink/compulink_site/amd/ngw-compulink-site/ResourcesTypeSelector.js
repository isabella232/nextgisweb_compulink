define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    'dojo/request/xhr',
    'dojo/on',
    'dijit/registry',
    'ngw-compulink-libs/jstree-3.0.9/jstree'
], function (declare, lang, topic, Deferred, xhr, on, registry, jstree) {

    return declare('ResourcesTypeSelector', [], {
        _selectDijit: null,

        constructor: function (domId) {
            this._selectDijit = registry.byId(domId);
            this.bindEvents();
        },

        bindEvents: function () {
            on(this._selectDijit, 'change', lang.hitch(this, function (selectedType) {
                topic.publish('resources/type/set', selectedType);
            }));
        },

        selectResourceType: function (resourceType) {
            this._selectDijit.attr('value', resourceType);
        }
    });
});