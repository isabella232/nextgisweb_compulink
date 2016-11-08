define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    './stores/AcceptedPartsStore',
    './stores/ActualRealOpticalCableStore',
    './layers/AcceptedPartsLayer',
    './layers/ActualRealOpticalCableLayer',
    './AcceptedPartsCreator',
    './ui/AcceptedPartsTable/AcceptedPartsTable'
], function (declare, lang, query, on, topic,
             AcceptedPartsStore, ActualRealOpticalCableStore,
             AcceptedPartsLayer, ActualRealOpticalCableLayer,
             AcceptedPartsCreator, AcceptedPartsTable) {
    return declare([], {
        _map: null,
        _constructObjectId: null,
        _acceptedPartsStore: null,
        _actualRealOpticalCableStore: null,
        _acceptedPartsLayer: null,
        _actualRealOpticalCableLayer: null,

        constructor: function (map, acceptedPartsPanel) {
            this._map = map;

            this.AcceptedPartsTable = new AcceptedPartsTable(acceptedPartsPanel.acceptedPartsTable, acceptedPartsPanel);

            this._acceptedPartsStore = new AcceptedPartsStore();
            this._acceptedPartsLayer = new AcceptedPartsLayer(map, this._acceptedPartsStore);

            this._actualRealOpticalCableStore = new ActualRealOpticalCableStore();
            this._actualRealOpticalCableLayer = new ActualRealOpticalCableLayer(map, this._actualRealOpticalCableStore);

            this._aaceptedPartsCreator = new AcceptedPartsCreator(
                this._map,
                this._acceptedPartsStore,
                this._acceptedPartsLayer,
                this._actualRealOpticalCableStore,
                this._actualRealOpticalCableLayer
            );

            this._bindEvents();
        },

        _bindEvents: function () {
            topic.subscribe('/table/construct_object/selected', lang.hitch(this, this._selectConstructObjectHandler));
            topic.subscribe('/table/construct_object/data/changed', lang.hitch(this,
                this._dataConstructObjectsTableChangedHandler));
        },

        _selectConstructObjectHandler: function (constructObjectInfo) {
            if (this._constructObjectId) {
                this._clearStores();
            }
            var constructObjectId = constructObjectInfo.id;
            this._actualRealOpticalCableStore.fetch(constructObjectId);
            this._acceptedPartsStore.fetch(constructObjectId);
            this._constructObjectId = constructObjectId;
        },

        _dataConstructObjectsTableChangedHandler: function (store) {
            if (this._constructObjectId === null) return false;
            this._clearStores();
            this._constructObjectId = null;
        },

        _clearStores: function () {
            this._acceptedPartsStore.clear();
            this._actualRealOpticalCableStore.clear();
        }
    });
});