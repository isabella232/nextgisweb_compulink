define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/on',
    'dijit/registry',
    'dijit/form/Button',
    'dijit/Dialog'
], function (declare, lang, topic, on, registry, Button, Dialog) {
    return declare([Button], {
        label: 'Построить',
        _divisionSelect: null,
        _yearSelect: null,
        _initialization: false,

        postCreate: function () {
            this._divisionSelect = registry.byId(this.divisionSelectorId);
            this._yearSelect = registry.byId(this.yearsSelectorId);

            on(this, 'click', lang.hitch(this, function () {
                this._fireRenderCharts();
            }));

            topic.subscribe('/reports/ucn/charts/init', lang.hitch(this, function () {
                var division = this._divisionSelect.getDivision(),
                    years = this._yearSelect.getYears();
                if (this._initialization || !division || years.length < 1) return false;
                this._initialization = true;
                this._fireRenderCharts();
            }));
        },

        _fireRenderCharts: function () {
            var division = this._divisionSelect.getDivision(),
                years = this._yearSelect.getYears();

            if (!division) {
                this.showDialog('Внимание', 'Не выбрано подразделение!');
                return false;
            }

            if (years.length < 1) {
                this.showDialog('Внимание', 'Не выбран период для расчета!');
                return false;
            }

            topic.publish('/reports/ucn/charts/render', {
                'division': division,
                'years': years
            });
        },

        showDialog: function (title, message) {
            var dialog = new Dialog({
                title: title,
                style: "width: 300px",
                onHide: function () {
                    dialog.destroy()
                }
            });

            dialog.set("content", message);
            dialog.show();
        }
    });
});
