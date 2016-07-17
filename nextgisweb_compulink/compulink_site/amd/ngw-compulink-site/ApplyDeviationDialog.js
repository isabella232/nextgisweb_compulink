define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojo/json',
    'ngw/route',
    'ngw-compulink-site/ConfirmDialog'
], function (declare, lang, xhr, json, route, ConfirmDialog) {
    return declare(null, {
        constructor: function (options) {
            lang.mixin(this, options);

            var deviationData = {
                layerType: this.layerType,
                layerId: this.resourceId,
                featureId: this.featureId
            };

            var html = '<label>Комментарий:</label><br/>' +
                '<textarea id=applyDeviationComment style=width:200px;height:60px;margin:3px;></textarea>';
            this._applyDeviationDialog = new ConfirmDialog({
                title: 'Утверждение отклонения',
                id: 'applyDeviation',
                message: html,
                buttonOk: 'Утвердить',
                buttonCancel: 'Отменить',
                isDestroyedAfterHiding: true,
                handlerOk: lang.hitch(this, function () {
                    deviationData.comment = document.getElementById('applyDeviationComment').value;
                    this._applyDeviation(deviationData);
                }),
                handlerCancel: lang.hitch(this, function () {
                    this._applyDeviationDialog = null;
                })
            });
            this._applyDeviationDialog.show();
        },

        _applyDeviation: function (deviationData) {
            xhr.post(route('compulink.deviation.apply'), {
                handleAs: 'json',
                data: json.stringify(deviationData)
            }).then(lang.hitch(this, function (response) {
                this.clearControls();
                this.updateMapLayers();
            }), lang.hitch(this, function (err) {
                console.log(err);
                window.alert('На сервере произошла ошибка!');
            }));
        },

        clearControls: function () {
            if (!this.indentify && !this.indentify._clearControls) {
                return false;
            }

            this.indentify._clearControls();
        },

        updateMapLayers: function () {
            if (!this.map) {
                return false;
            }

            var olMap = this.map.olMap,
                center = olMap.getCenter(),
                zoom = olMap.getZoom();
            center.lon++;
            olMap.setCenter(center, zoom);
        }
    });
});
