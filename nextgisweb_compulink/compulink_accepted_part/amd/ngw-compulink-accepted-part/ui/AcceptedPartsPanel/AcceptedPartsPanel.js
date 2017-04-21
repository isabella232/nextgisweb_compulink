define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'dojo/html',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-compulink-accepted-part/ui/AcceptedPartsTable/AcceptedPartsTable',
    'dojo/text!./AcceptedPartsPanel.html',
    'xstyle/css!./css/fontello/css/fontello.css',
    'xstyle/css!./css/AcceptedPartsPanel.css'
], function (declare, lang, query, on, topic, html, domAttr, domClass,
             _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             AcceptedPartsTable, template) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        _mode: 'edit',

        postCreate: function () {
            this._bindAcceptedPartsPanelEvents();
        },

        _bindAcceptedPartsPanelEvents: function () {
            on(this.acceptedPartsLayerToggle, 'change', lang.hitch(this, function (state) {
                if (state) {
                    this.acceptedPartsLayerToggle.set('iconClass', 'icon icon-eye');
                } else {
                    this.createAcceptedPartToggle.set('disabled', 'disabled');
                    this.createAcceptedPartToggle.attr('checked', false);
                    topic.publish('compulink/accepted-parts/layers/first-point/undo/off');
                }

                if (state && this._mode === 'edit' && this.acceptedPartsManager.getConstructObjectId()) {
                    this.createAcceptedPartToggle.set('disabled', false);
                }

                topic.publish('compulink/accepted-parts/ui/layer/visibility/changed', state);
            }));

            on(this.createAcceptedPartToggle, 'change', lang.hitch(this, function (state) {
                topic.publish('compulink/accepted-parts/ui/create-new-accepted-part/changed', state);
            }));

            topic.subscribe('compulink/accepted-parts/ui/create-ap-toggle/off', lang.hitch(this,
                function () {
                    this.createAcceptedPartToggle.attr('checked', false);
                })
            );

            topic.subscribe('compulink/accepted-parts/store/accepted-parts/fetched', lang.hitch(this,
                function (features, initiator) {
                    if (initiator === 'create' || initiator === 'delete' || initiator === 'modify') {
                        return true;
                    }
                    this._changeFilter('');
                    this.acceptedPartsFilter.set('disabled', false);

                    var layerTurned = this.isLayerToggleTurned();
                    topic.publish('compulink/accepted-parts/ui/layer/visibility/changed', layerTurned);
                    if (layerTurned && this._mode === 'edit' && this.acceptedPartsManager.getConstructObjectId()) {
                        this.createAcceptedPartToggle.attr('checked', false);
                        this.createAcceptedPartToggle.set('disabled', false);
                    }
                })
            );

            topic.subscribe('/table/construct_object/data/changed', lang.hitch(this, function (store) {
                this.createAcceptedPartToggle.set('disabled', 'disabled');
                this._changeFilter('');
                this.acceptedPartsFilter.set('disabled', 'disabled');
            }));

            on(this.acceptedPartsFilter, 'keyup', lang.hitch(this, function (event) {
                this._handleFilterChanged();
            }));

            topic.subscribe('compulink/accepted-parts/layers/first-point/undo/on', lang.hitch(this, function () {
                this.undoFirstPoint.set('disabled', false);
            }));

            topic.subscribe('compulink/accepted-parts/layers/first-point/undo/off', lang.hitch(this, function () {
                this.undoFirstPoint.set('disabled', 'disabled');
            }));

            on(this.undoFirstPoint, 'click', lang.hitch(this, function () {
                topic.publish('compulink/accepted-parts/layers/first-point/undo');
            }));

            topic.subscribe('/compulink/accepted-parts/manager/access-level/change', lang.hitch(this, function (accessLevel) {
                this.setMode(accessLevel);
            }));
        },

        _changeFilter: function (value) {
            this.acceptedPartsFilter.set('value', '');
            this._handleFilterChanged();
        },

        _handleFilterChanged: function () {
            topic.publish('compulink/accepted-parts/ui/table/filter/changed', this.acceptedPartsFilter.get('value'));
        },

        setMode: function (mode) {
            this._mode = mode;
        },

        isLayerToggleTurned: function () {
            return this.acceptedPartsLayerToggle.get('checked');
        }
    });
});