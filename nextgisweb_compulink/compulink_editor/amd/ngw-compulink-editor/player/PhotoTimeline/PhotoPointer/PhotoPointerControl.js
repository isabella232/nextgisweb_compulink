define([
    'ngw/openlayers',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./PhotoPointer.mustache',
    'xstyle/css!./PhotoPointer.css'
], function (openlayers, mustache, template) {
    return openlayers.Class(openlayers.Control, {
        CLASS_NAME: 'OpenLayers.Control.PhotoPointer',
        template: mustache.parse(template),

        draw: function () {
            var div = openlayers.Control.prototype.draw.apply(this);
            div.innerHTML = mustache.render(template, this);
            return div;
        }
    });
});
