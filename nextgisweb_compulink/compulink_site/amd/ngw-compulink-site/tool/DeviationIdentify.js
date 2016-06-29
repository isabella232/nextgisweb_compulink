define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/request/xhr',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/json',
    'dijit/Menu',
    'dijit/MenuItem',
    'ngw/route',
    'ngw-compulink-site/tool/DeviationIdentifyControl',
    'ngw-compulink-site/tool/Identify',
    'ngw-compulink-site/tool/IdentifyPopup',
    'ngw-compulink-site/ConfirmDialog'
], function (declare, array, xhr, lang, domConstruct, json,
             Menu, MenuItem, route, DeviationIdentifyControl,
             Identify, IdentifyPopup, ConfirmDialog) {
    return declare(Identify, {
        constructor: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl = new DeviationIdentifyControl({
                tool: this,
                olMap: this.display.map.olMap
            });
            this.display.map.olMap.addControl(this.deviationIndentifyControl);
        },

        activate: function () {
            this.inherited(arguments);
            this.deviationIndentifyControl.activate();
        },

        deactivate: function () {
            this.inherited(arguments);

            if (this._deviationMenu) {
                this._deviationMenu.destroy();
                this._clearIdentifyLayer();
            }

            this.deviationIndentifyControl.deactivate();
        },

        rightClickDeviation: function (pixel) {
            var olMap = this.display.map.olMap,
                point = olMap.getLonLatFromPixel(pixel),
                request,
                layersInfoIdentify,
                layersLabels,
                isIdentifyActive = true;

            this._addIdentifyLoadingMarker(point);

            layersInfoIdentify = this._getLayersInfoIdentify();
            layersLabels = this._getLayersLabel(layersInfoIdentify);

            request = {
                srs: 3857,
                geom: this._requestGeomString([pixel.x, pixel.y]),
                layers: layersInfoIdentify
            };

            xhr.post(route('compulink.deviation.identify'), {
                handleAs: 'json',
                data: json.stringify(request)
            }).then(lang.hitch(this, function (response) {
                isIdentifyActive = false;
                this._clearIdentifyLayer();
                var marker = this._addIdentifyMarker(point);
                this._buildDeviationsMenu(response, layersLabels, marker.icon.imageDiv);
            }), lang.hitch(this, function (err) {
                console.log(err);
                this._clearIdentifyLayer();
            }));
        },

        _deviationMenu: null,
        _buildDeviationsMenu: function (response, layersLabels, div) {
            var layersOrdered, layerId, layerOrderedItem,
                layerResponse, idx, node, deviationMenu,
                menuItemLabel,
                widget = this;

            node = domConstruct.create('div', {
                'class': 'identify-deviation-menu'
            }, div);
            deviationMenu = new Menu({}, node);

            layersOrdered = IdentifyPopup.getLayersOrdered(this.layersManager);
            for (var i = 0, layersCount = layersOrdered.length; i < layersCount; i++) {
                layerOrderedItem = layersOrdered[i];
                layerId = layerOrderedItem.id;
                layerResponse = response[layerId];
                idx = 0;
                array.forEach(layerResponse.features, function (feature) {
                    menuItemLabel = layerOrderedItem.layerName + ': ' +
                        (feature.label || "#" + feature.id) +
                        " (" + feature.parent + ")";

                    deviationMenu.addChild(new MenuItem({
                        deviationData: {
                            layerType: layerOrderedItem.lt,
                            layerId: feature.layerId,
                            featureId: feature.id
                        },
                        label: menuItemLabel,
                        onClick: function () {
                            widget._handleMenuItemClick(this.deviationData);
                        }
                    }));

                    idx++;
                }, this);
            }

            deviationMenu.startup();
            this._deviationMenu = deviationMenu;
        },

        _handleMenuItemClick: function (deviationData) {
            this._clearIdentifyLayer();
            this._deviationMenu.destroy();
            this._showApplyDeviationDialog(deviationData);
        },

        _applyDeviationDialog: null,
        _showApplyDeviationDialog: function (deviationData) {
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
                console.log(response);
            }), lang.hitch(this, function (err) {
                console.log(err);
            }));
        }
    });
});