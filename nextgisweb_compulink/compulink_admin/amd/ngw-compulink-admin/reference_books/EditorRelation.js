define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/on',
    'dojo/_base/array',
    'ngw-compulink-libs/dgrid-0.4.0/dgrid/Editor'
], function (declare, lang, topic, on, array, Editor) {
    return declare([Editor], {
        _updateProperty: function (cellElement, oldValue, value, triggerEvent) {
            // Updates dirty hash and fires dgrid-datachange event for a changed value.
            var self = this;

            // test whether old and new values are inequal, with coercion (e.g. for Dates)
            if ((oldValue && oldValue.valueOf()) !== (value && value.valueOf())) {
                var cell = this.cell(cellElement);
                var row = cell.row;
                var column = cell.column;
                // Re-resolve cellElement in case the passed element was nested
                cellElement = cell.element;

                if (column.field && row) {
                    var eventObject = {
                        grid: this,
                        cell: cell,
                        oldValue: oldValue,
                        value: value,
                        bubbles: true,
                        cancelable: true
                    };
                    if (triggerEvent && triggerEvent.type) {
                        eventObject.parentType = triggerEvent.type;
                    }

                    if (on.emit(cellElement, 'dgrid-datachange', eventObject)) {
                        if (this.updateDirty) {
                            // for OnDemandGrid: update dirty data, and save if autoSave is true
                            this.updateDirty(row.id, column.field, value);
                            // perform auto-save (if applicable) in next tick to avoid
                            // unintentional mishaps due to order of handler execution
                            if (column.autoSave) {
                                setTimeout(function () {
                                    self._trackError('save');
                                }, 0);
                            }
                        }
                        else {
                            // update store-less grid
                            row.data[column.field] = value;
                        }
                    }
                    else {
                        // Otherwise keep the value the same
                        // For the sake of always-on editors, need to manually reset the value
                        var cmp;
                        if ((cmp = cellElement.widget)) {
                            // set _dgridIgnoreChange to prevent an infinite loop in the
                            // onChange handler and prevent dgrid-datachange from firing
                            // a second time
                            cmp._dgridIgnoreChange = true;
                            cmp.set('value', oldValue);
                            setTimeout(function () {
                                cmp._dgridIgnoreChange = false;
                            }, 0);
                        }
                        else if ((cmp = cellElement.input)) {
                            this._updateInputValue(cmp, oldValue);
                        }

                        return oldValue;
                    }
                }
            }
            return value;
        }
    });
});
