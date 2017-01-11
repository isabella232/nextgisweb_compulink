define([
    'dojo/_base/declare',
    'dojo/Deferred',
    'ngw-compulink-libs/howler-2.0.0/howler.min'
], function (declare, Deferred) {

    return declare(null, {
        _activate: true,
        _sound: null,

        constructor: function () {
        },

        init: function () {
            var deferred = new Deferred();

            this._sound = new Howl({
                src: [displayConfig.playerSoundFile],
                loop: true
            });

            this._sound.once('load', function () {
                deferred.resolve();
            });

            return deferred.promise;
        },

        play: function (position) {
            if (!this._sound) return false;
            if (!this._activate || this._sound.playing()) return false;
            if (position) {
                if (position > this._sound.duration()) {
                    position = position - Math.floor(position / this._sound.duration()) * this._sound.duration();
                }
                this._sound.seek(position);
            }
            this._sound.play();
        },

        stop: function () {
            if (!this._activate || !this._sound) return false;
            this._sound.stop();
        },

        activate: function () {
            if (!this._sound) return false;
            this._activate = true;
        },

        deactivate: function () {
            if (!this._sound) return false;
            this._activate = false;
            this._sound.stop();
        }
    });
});
