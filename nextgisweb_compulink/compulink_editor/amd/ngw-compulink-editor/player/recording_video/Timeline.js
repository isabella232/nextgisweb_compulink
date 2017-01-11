define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    '../Timeline',
    'xstyle/css!./Timeline.css'
], function (declare, lang, topic, Deferred, Timeline) {
    return declare([Timeline], {
        // audio should be off for recording video
        initAudioManager: function () {
            var deferred = new Deferred();
            deferred.resolve();
            return deferred;
        },

        _bindEvents: function () {
            this.inherited(arguments);

            topic.subscribe('compulink/player/loaded', lang.hitch(this, function () {
                setTimeout(lang.hitch(this, function () {
                    this._setParameters();
                    this._overrideGlobalFunctions();
                    this._setStoppedHandler();
                }), 3000);
            }));
        },

        _setStoppedHandler: function () {
            topic.subscribe('compulink/player/stopped', lang.hitch(this, function () {
                setTimeout(lang.hitch(this, function () {
                    this._playerState = 'finished';
                }), 3000);
            }));
        },

        _setParameters: function () {

        },

        _playerState: 'ready',
        _overrideGlobalFunctions: function () {
            window.startPlayer = lang.hitch(this, function () {
                if (this._playerState === 'playing') {
                    return false;
                }
                this._playerState = 'playing';
                this.play(this._timeline.getCustomTime(this._barId));
            });

            window.getPlayerState = lang.hitch(this, function () {
                return this._playerState;
            });
        }
    });
});
