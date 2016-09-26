define([
    'dojo/_base/declare',
    'ngw-compulink-libs/howler-2.0.0/howler.min'
], function (declare) {

    var sound = new Howl({
        src: [displayConfig.playerSoundFile]
    });

    return declare(null, {
        constructor: function () {

        },

        play: function () {
            sound.play();
        },

        stop: function () {
            sound.stop();
        }
    });
});
