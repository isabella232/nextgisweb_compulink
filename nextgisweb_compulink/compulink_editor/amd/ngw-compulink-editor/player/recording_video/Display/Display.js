define([
    'dojo/_base/declare',
    '../../Display',
    '../Timeline',
    'dojo/text!./Display.html',
    'xstyle/css!./Display.css'
], function (declare, Display, Timeline, template) {
    return declare([Display], {
        templateString: template,

        _setTimelineClass: function () {
            this._TimelineClass = Timeline;
        }
    });
});
