define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/Deferred',
    '../Timeline',
    'xstyle/css!./Timeline.css'
], function (declare, lang, topic, Deferred, Timeline) {
    return declare([Timeline], {
        DELAY_AFTER_LOADED: 3000,
        DELAY_AFTER_PLAY_FINISHED: 3000,
        count_units: null,
        units: null,
        sound: null,
        photo: null,

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
            this._handleParameter('count_units');
            if (this.count_units) {
                this._countUnitSelector.set('value', this.count_units);
            }

            this._handleParameter('units');
            if (this.units) {
                this._unitsSelector.set('value', this.units);
            }

            this._handleParameter('sound');
            this._handleParameter('photo');

            this._handleParameter('DELAY_AFTER_LOADED');
            this._handleParameter('DELAY_AFTER_PLAY_FINISHED');
        },

        _handleParameter: function (parameterName) {
            if (window.playerParams[parameterName]) {
                this[parameterName] = window.playerParams[parameterName];
            }
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
