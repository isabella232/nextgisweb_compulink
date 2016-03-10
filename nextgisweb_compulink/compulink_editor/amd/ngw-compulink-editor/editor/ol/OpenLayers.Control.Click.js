define([
    'ngw/openlayers'
], function (openlayers) {
    return openlayers.Class(openlayers.Control, {
        defaultHandlerOptions: {
            'single': true,
            'double': false,
            'pixelTolerance': 0,
            'stopSingle': false,
            'stopDouble': false
        },

        initialize: function (options) {
            if (!options) {
                options = {};
            }
            this.handlerOptions = openlayers.Util.extend(options, this.defaultHandlerOptions);
            openlayers.Control.prototype.initialize.apply(this, arguments);
            this.handler = new openlayers.Handler.Click(
                this, {
                    'click': this.handlerOptions.callback
                }, this.handlerOptions
            );
        }
    });
});