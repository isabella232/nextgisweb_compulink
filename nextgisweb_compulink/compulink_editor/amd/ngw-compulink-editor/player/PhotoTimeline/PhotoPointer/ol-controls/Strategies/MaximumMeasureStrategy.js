define([
    'dojo/_base/declare',
    'dojo/_base/array'
], function (declare, array) {
    return declare(null, {
        pointerControl: null,

        constructor: function (pointerControl) {
            this.pointerControl = pointerControl;
        },

        getImageContainer: function (photoInfo) {
            var pointerControl = this.pointerControl,
                geometry = photoInfo.feature.geometry,
                imagePoint,
                distance, maxDistance = -1,
                targetImageContainerInfo;

            array.forEach(pointerControl._imageContainers, function (imageContainerInfo) {
                imagePoint = imageContainerInfo.position.point;
                distance = geometry.distanceTo(imagePoint);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    targetImageContainerInfo = imageContainerInfo;
                }
            });

            return targetImageContainerInfo;
        }
    });
});
