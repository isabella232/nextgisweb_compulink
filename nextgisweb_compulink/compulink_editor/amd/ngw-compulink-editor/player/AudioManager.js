define([
    'dojo/_base/declare',
    'ngw-compulink-libs/howler-2.0.0/howler.min'
], function (declare) {

    var sound = new Howl({
        src: [displayConfig.playerSoundFile],
        loop: true
    });

    return declare(null, {
        _activate: true,

        constructor: function () {
        },

        play: function (position) {
            if (!this._activate) return false;
            if (position) {
                if (position > sound.duration()) {
                    position = position - Math.floor(position / sound.duration()) * sound.duration();
                }
                sound.seek(position);
            }
            sound.play();
        },

        stop: function () {
            if (!this._activate) return false;
            sound.stop();
        },

        activate: function () {
            this._activate = true;
        },

        deactivate: function () {
            this._activate = false;
            sound.stop();
        }
    });
});
