define([
    'dojo/_base/declare',
    'dojox/widget/Standby'
], function (declare, Standby) {
    return declare([Standby], {
        target: 'mapPane',

        postCreate: function () {
            this.inherited(arguments);
            document.body.appendChild(this.domNode);
            this.startup();
        }
    });
});