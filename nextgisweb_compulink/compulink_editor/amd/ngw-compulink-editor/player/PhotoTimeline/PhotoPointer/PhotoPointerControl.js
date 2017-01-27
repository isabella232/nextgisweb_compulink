define([
    'ngw/openlayers',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./PhotoPointer.mustache',
    'xstyle/css!./PhotoPointer.css'
], function (openlayers, mustache, template) {
    return openlayers.Class(openlayers.Control, {
        CLASS_NAME: 'OpenLayers.Control.PhotoPointer',
        template: mustache.parse(template),
        _pointerLayer: null,

        draw: function () {
            var div = openlayers.Control.prototype.draw.apply(this);
            div.innerHTML = mustache.render(template, this);
            return div;
        },

        activate: function () {
            openlayers.Control.prototype.activate.apply(this);
            this._activateLayer();
        },

        deactivate: function () {
            openlayers.Control.prototype.deactivate.apply(this);
            this._deactivateLayer();
        },

        _activateLayer: function () {
            this.map.addLayer(this._getLayer());
        },

        _deactivateLayer: function () {
            this.map.removeLayer(this._getLayer());
        },

        _getLayer: function () {
            if (!this._pointerLayer) {
                this._pointerLayer = this._makeLayer();
            }
            return this._pointerLayer;
        },

        _makeLayer: function () {
            return new openlayers.Layer.Vector(this.id);
        }
    });
});
