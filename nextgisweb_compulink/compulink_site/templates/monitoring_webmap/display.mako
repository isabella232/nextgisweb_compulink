<%inherit file='../base_site.mako' />


<%def name="title()">
    Карта контроля хода выполнения работ
</%def>


<%def name="head()">
    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>
</%def>


<%block name="body">

    <div data-dojo-attach-point="tabContainer"
        data-dojo-type="dijit/layout/TabContainer"
        data-dojo-props="tabPosition: 'top'"
        style="width: 100%; height: 100%;">

        <!-- Незакрываемый таб для размещения карты и дерева слоев -->
        <!-- Если у таба нет иконки и он незакрываем, то плывет верстка! -->
        <div data-dojo-attach-point="mainPane" title="Карта"
            data-dojo-type="dijit/layout/ContentPane"
            data-dojo-props="closable: false, iconClass: 'iconMap'"
            style="width: 100%; height: 100%; padding: 0">

            <div data-dojo-type="dijit/layout/BorderContainer"
                data-dojo-props="gutters: false"
                style="width: 100%; height: 100%;">

                <!-- Панель для размещения OL карты -->
                <div data-dojo-type="dijit/layout/BorderContainer"
                    data-dojo-props="region: 'center'"
                    style="padding-left: 0;">

                    <!-- Тулбар над картой -->
                    <div data-dojo-attach-point="mapToolbar"
                        data-dojo-type="dijit/Toolbar"
                        data-dojo-props="region: 'top'">

                        <div style="padding: 0 4px; float: right;">

                            <div data-dojo-attach-point="bookmarkButton"
                                data-dojo-type="dijit/form/DropDownButton"
                                data-dojo-props="label: 'Закладки', iconClass: 'dijitIconBookmark'">

                                <div data-dojo-attach-point="bookmarkMenu"
                                    data-dojo-type="dijit/Menu">
                                </div>

                            </div>
                        </div>

                        <!-- Распорка по высоте -->
                        <div data-dojo-type="dijit/form/Button" style="width: 0;">&nbsp;</div>

                        <div data-dojo-attach-point="zoomToInitialExtentButton"
                            data-dojo-type="dijit/form/Button"
                            data-dojo-props="iconClass: 'iconArrowInOut', showLabel: false">
                        </div>

                        <div data-dojo-type="dijit/ToolbarSeparator"
                            data-dojo-props="label: 'Начальный охват'">
                        </div>

                        <div data-dojo-attach-point="infoNode"
                            style="display: inline-block; vertical-align: middle; float: right; padding: 0 4px;">

                            <div data-dojo-type="dijit/form/Button" style="width: 0;">&nbsp;</div>

                            <span style="color: #999">Долгота</span>
                            <span data-dojo-attach-point="centerLonNode"></span>

                            <span style="color: #999">Широта</span>
                            <span data-dojo-attach-point="centerLatNode"></span>

                            <span style="color: #999">Масштаб</span>
                            <span data-dojo-attach-point="scaleInfoNode"></span>
                        </div>
                    </div>

                    <div data-dojo-attach-point="mapPane"
                        data-dojo-type="dijit/layout/ContentPane"
                        data-dojo-props="region: 'center'"
                        style="width: 100%; padding: 0;">

                        <div data-dojo-attach-point="mapNode"
                            style="position: absolute; width: 100%; height: 100%; padding: 0;">


                            <a id="permalink" data-dojo-attach-event="onclick:_getPermalink" href="#" style="position: absolute; bottom: 20px; right: 0; z-index: 2000; margin: 4px; font-size: smaller;">Ссылка</a>
                            <div data-dojo-attach-point="permalinkDialog" data-dojo-type="dijit/Dialog" data-dojo-props="title: 'Ссылка', autofocus: false, draggable: false" style="display: none;">
                                <div data-dojo-attach-point="permalinkContent" data-dojo-type="dijit/form/TextBox" data-dojo-props="readOnly: false, selectOnClick: true" style="width: 300px;"></div>
                            </div>
                        </div>

                    </div>

                </div>

                <div data-dojo-type="dijit/layout/BorderContainer"
                    data-dojo-props="region: 'left', splitter: true, gutters: false"
                    style="width: 250px; padding: 0;">

                    <div data-dojo-type="dijit/layout/BorderContainer"
                        data-dojo-props="region: 'center'"
                        style="padding-bottom: 0; padding-right: 0">

                        <!-- Панель для размещения дерева РЕСУРСОВ -->
                        <div data-dojo-attach-point="resourceTreePane"
                            data-dojo-type="dijit/layout/ContentPane"
                            data-dojo-props="region: 'center'"
                            style="padding: 0">
                        </div>

                    </div>

                    <!-- Панель для размещения переключателя подложки -->
                    <div data-dojo-attach-point="basemapPane"
                        data-dojo-type="dijit/layout/ContentPane"
                        data-dojo-props="region: 'bottom', border: false"
                        style="padding-left: 5px; padding-right: 2px;">

                        <select data-dojo-attach-point="basemapSelect"
                            data-dojo-type="dijit/form/Select"
                            style="width: 100%;">
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script type="text/javascript">
/* global console, ngwConfig */
require([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/number",
    "dojo/aspect",
    "dojo/io-query",
    "ngw/openlayers",
    "ngw/openlayers/Map",
    "dijit/registry",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/layout/ContentPane",
    "dijit/form/ToggleButton",
    "dojo/dom-style",
    "dojo/store/JsonRest",
    "dojo/request/xhr",
    "dojo/data/ItemFileWriteStore",
    "cbtree/models/TreeStoreModel",
    "cbtree/Tree",
    "ngw/route",
    // tools
    "ngw/tool/Base",
    "ngw/tool/Zoom",
    "ngw/tool/Measure",
    // settings
    "ngw/settings!webmap",
    // template
    "dijit/layout/TabContainer",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojox/layout/TableContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/Select",
    "dijit/form/DropDownButton",
    "dijit/ToolbarSeparator",
    "dijit/Dialog",
    "dijit/form/TextBox",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + "cbtree/themes/claro/claro.css"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    lang,
    array,
    Deferred,
    all,
    number,
    aspect,
    ioQuery,
    openlayers,
    Map,
    registry,
    DropDownButton,
    DropDownMenu,
    MenuItem,
    ContentPane,
    ToggleButton,
    domStyle,
    JsonRest,
    xhr,
    ItemFileWriteStore,
    TreeStoreModel,
    Tree,
    route,
    ToolBase,
    ToolZoom,
    ToolMeasure,
    clientSettings
) {
    //TODO
});
    </script>

</%block>