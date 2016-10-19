/*global console, OpenLayers*/
define([], function () {
    return OpenLayers.Class(OpenLayers.Control, {
        handleRightClicks: true,

        initialize: function (options) {
            OpenLayers.Control.prototype.initialize.apply(this, [options]);

            if (options.rightClickHandler) {
                this._setContextMenuHandler();
                this.handler = new OpenLayers.Handler.Click(this, {
                    rightclick: this.clickCallback,
                    single: true,
                    'double': false,
                    pixelTolerance: null
                });
            }
        },

        _setContextMenuHandler: function () {
            this.olMap.div.oncontextmenu = function (e) {
                e = e ? e : window.event;
                if (e.preventDefault) e.preventDefault(); // For non-IE browsers.
                else return false; // For IE browsers.
            };
        },

        clickCallback: function (evt) {
            this.tool.rightClickDeviation(new OpenLayers.Pixel(evt.xy.x, evt.xy.y));
        }
    });
});
