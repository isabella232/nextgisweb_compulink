/*global console, OpenLayers*/
define([], function () {
    return OpenLayers.Class(OpenLayers.Control, {
        handleRightClicks: true,

        initialize: function (options) {
            OpenLayers.Control.prototype.initialize.apply(this, [options]);
            this.handler = new OpenLayers.Handler.Click(this, {
                rightclick: this.clickCallback
            });
        },

        clickCallback: function (evt) {
            this.tool.rightClickDeviation(new OpenLayers.Pixel(evt.xy.x, evt.xy.y));
        }
    });
});
