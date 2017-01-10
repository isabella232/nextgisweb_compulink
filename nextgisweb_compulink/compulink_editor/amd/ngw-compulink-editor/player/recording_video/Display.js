define([
    'dojo/_base/declare',
    '../Display',
    './Timeline'
], function (declare, Display, Timeline) {
    return declare([Display], {
        _setTimelineClass: function () {
            this._TimelineClass = Timeline;
        }
    });
});
