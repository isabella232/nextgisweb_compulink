define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    './stores/AcceptedPartsStore',
    './stores/ActualRealOpticalCableStore',
    './layers/AcceptedPartsLayer',
    './layers/ActualRealOpticalCableLayer',
    './AcceptedPartsCreator',
    './ui/AcceptedPartsTable/AcceptedPartsTable',
    './_ServiceFacadeMixin'
], function (declare, lang, array, query, on, topic,
             AcceptedPartsStore, ActualRealOpticalCableStore,
             AcceptedPartsLayer, ActualRealOpticalCableLayer,
             AcceptedPartsCreator, AcceptedPartsTable, _ServiceFacadeMixin) {
    return declare([_ServiceFacadeMixin], {
        _map: null,
        _constructObjectId: null,
        _acceptedPartsStore: null,
        _actualRealOpticalCableStore: null,
        _acceptedPartsLayer: null,
        _actualRealOpticalCableLayer: null,
        _acceptedPartsTable: null,

        constructor: function (map, acceptedPartsPanel) {
            this._map = map;

            this._acceptedPartsStore = new AcceptedPartsStore();
            this._acceptedPartsLayer = new AcceptedPartsLayer(map, this._acceptedPartsStore);

            this._actualRealOpticalCableStore = new ActualRealOpticalCableStore();
            this._actualRealOpticalCableLayer = new ActualRealOpticalCableLayer(map, this._actualRealOpticalCableStore);

            this._aceptedPartsCreator = new AcceptedPartsCreator(
                this._map,
                this._acceptedPartsStore,
                this._acceptedPartsLayer,
                this._actualRealOpticalCableStore,
                this._actualRealOpticalCableLayer
            );

            this._acceptedPartsTable = new AcceptedPartsTable(acceptedPartsPanel.acceptedPartsTable, this._acceptedPartsStore);

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

            this.getAccessLevel(constructObjectId).then(
                lang.hitch(this, function (accessLevel) {
                    this._handleAccessLevel(constructObjectId, accessLevel.access_level);
                })
            );
        },

        _handleAccessLevel: function (constructObjectId, accessLevel) {
            this._constructObjectId = constructObjectId;

            switch (accessLevel) {
                case "disable":
                    this._acceptedPartsTable.setNoRightsMode();
                    return true;
                case "list":
                    this._acceptedPartsTable.setListMode();
                    break;
                case "edit":
                    this._acceptedPartsTable.setEditMode();
                    break;
                default:
                    console.error(new Error('AcceptedPartsManager: wrong accessLevel value "' + accessLevel + '"'));
            }

            topic.publish('/compulink/accepted-parts/manager/access-level/change', accessLevel);
            this._actualRealOpticalCableStore.fetch(constructObjectId);
            this._acceptedPartsStore.fetch(constructObjectId);
        },

        _dataConstructObjectsTableChangedHandler: function (store) {
            if (this._constructObjectId === null) return false;
            this._clearStores();
            this._constructObjectId = null;
        },

        _clearStores: function () {
            this._acceptedPartsStore.clear();
            this._actualRealOpticalCableStore.clear();
        },

        _applyZIndexesByChangeLayer: function (e) {
            if (e.property === 'order') {
                this._applyZIndexes();
            }
        },

        _applyZIndexes: function () {
            array.forEach(this._map.olMap.layers, function (layer) {
                if (layer.hasOwnProperty('_ap_zindex')) {
                    layer.setZIndex(layer._ap_zindex);
                }
            });
        },
    });
});