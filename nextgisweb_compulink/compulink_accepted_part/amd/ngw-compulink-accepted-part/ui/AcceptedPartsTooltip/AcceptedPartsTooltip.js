define([
    'dojo/_base/declare',
    'xstyle/css!./AcceptedPartsTooltip.css'
], function (declare) {
    return declare(null, {
        _map: null,
        _$olMap: null,
        _targetDiv: null,

        constructor: function (map) {
            this._map = map;
        },

        activate: function (message) {
            var $html = $('<span class="accepted-parts-tooltip">' + message + '</span>');
            this._$tooltip = $html.appendTo($(this._map.olMap.div).parent());
            this._$olMap = $(this._map.olMap.div);

            this._map.olMap.events.register('mousemove', this, this._mouseMoveHandler);
        },

        _mouseMoveHandler: function (e) {
            var offsetOlMap = this._$olMap.offset();
            this._$tooltip.css('left', e.pageX - offsetOlMap.left);
            this._$tooltip.css('top', e.pageY - offsetOlMap.top);
        },

        updateMessage: function (message) {
            this._$tooltip.html(message);
        },

        deactivate: function () {
            this._map.olMap.events.unregister('mousemove', this, this._mouseMoveHandler);
            this._$tooltip.remove();
        }
    });
});
