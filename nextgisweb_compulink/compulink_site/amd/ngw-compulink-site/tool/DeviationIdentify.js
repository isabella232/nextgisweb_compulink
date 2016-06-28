define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/request/xhr',
    'dojo/_base/lang',
    'dojo/json',
    'ngw/route',
    'ngw-compulink-site/tool/DeviationIdentifyControl',
    './Identify'
], function (declare, array, xhr, lang, json, route, DeviationIdentifyControl, Identify) {
    return declare(Identify, {
        constructor: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl = new DeviationIdentifyControl({
                tool: this,
                olMap: this.display.map.olMap
            });
            this.display.map.olMap.addControl(this.deviationIndentifyControl);
        },

        activate: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl.activate();
        },

        deactivate: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl.deactivate();
        },

        rightClickDeviation: function (pixel) {
            var olMap = this.display.map.olMap,
                point = olMap.getLonLatFromPixel(pixel),
                vectors_ids = [],
                request = {
                    srs: 3857,
                    geom: this._requestGeomString([pixel.x, pixel.y]),
                    layers: []
                },
                isIdentifyActive = true;

            this._addIdentifyLoadingMarker(point);

            for (var lyr_name in this.display.map.layers) {
                var lyr = this.display.map.layers[lyr_name];
                if (lyr.vectors_ids) {
                    vectors_ids = lyr.vectors_ids.split(',');
                    array.forEach(vectors_ids, function (vector_id, index) {
                        request.layers.push(vector_id);
                    }, this);
                }
            }

            var layerLabels = {};
            array.forEach(request.layers, function (i) {
                layerLabels[i] = i;
            }, this);

            xhr.post(route("compulink.deviation.identify"), {
                handleAs: "json",
                data: json.stringify(request)
            }).then(lang.hitch(this, function (response) {
                console.log(response);
                isIdentifyActive = false;
                this._clearIdentifyLayer();
                this._responsePopup(response, point, layerLabels);
            }), lang.hitch(this, function (err) {
                console.log(err);
                this._clearIdentifyLayer();
            }));
        }
    });
});