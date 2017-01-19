define([
    'dojo/_base/declare',
    'dojo/dom-class',
    'dojo/on'
], function (declare, domClass, on) {
    return declare(null, {
        _btn: null,
        _clickHandlerObj: null,
        _clickHandlerFn: null,
        disabledClass: 'disabled',
        enabled: true,

        constructor: function (btn, fnHandler, makeClickHandler) {
            this._btn = btn;
            this._clickHandlerFn = fnHandler;
            if (makeClickHandler) {
                this.makeClickHandler();
            }
        },

        makeClickHandler: function () {
            this._clickHandlerObj = on(this._btn, 'click', this._clickHandlerFn);
        },

        enable: function () {
            if (this.enabled) return false;
            if (!this._clickHandlerObj) {
                this.makeClickHandler();
            }
            if (domClass.contains(this._btn, this.disabledClass)) {
                domClass.remove(this._btn, this.disabledClass);
            }
            this.enabled = true;
        },

        disable: function () {
            if (!this.enabled) return false;
            if (this._clickHandlerObj) {
                this._clickHandlerObj.remove();
                this._clickHandlerObj = null;
            }
            if (!domClass.contains(this._btn, this.disabledClass)) {
                domClass.add(this._btn, this.disabledClass);
            }
            this.enabled = false;
        },

        getBtnElement: function () {
            return this._btn;
        }
    });
});
