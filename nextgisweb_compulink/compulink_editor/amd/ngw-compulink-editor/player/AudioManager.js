define([
    'dojo/_base/declare',
    'ngw-compulink-libs/howler-2.0.0/howler.min'
], function (declare) {

    var sound = new Howl({
        src: [displayConfig.playerSoundFile],
        loop: true
    });

    return declare(null, {
        constructor: function () {

        },

        play: function (position) {
            if (position) {
                sound.seek(position);
            }
            sound.play();
        },

        stop: function () {
            sound.stop();
        }
    });
});
