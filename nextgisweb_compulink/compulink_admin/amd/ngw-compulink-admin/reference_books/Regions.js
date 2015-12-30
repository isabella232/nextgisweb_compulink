define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/_base/array',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojox/grid/EnhancedGrid',
    'dojox/grid/enhanced/plugins/Pagination',
    'dojo/data/ItemFileWriteStore',

    'dojox/grid/DataGrid',
    'dojox/grid/cells',
    'dojox/grid/cells/dijit',
    'dojo/store/Memory',
    'dojo/data/ObjectStore',
    'dojo/date/locale',
    'dojo/currency',
    'dijit/form/DateTextBox',
    'dijit/form/CurrencyTextBox',
    'dijit/form/HorizontalSlider',
    'dojo/store/JsonRest',

    'xstyle/css!dojox/grid/enhanced/resources/claro/EnhancedGrid.css',
    'xstyle/css!dojox/grid/enhanced/resources/EnhancedGrid_rtl.css'
], function (declare, lang, topic, array, _WidgetBase, _TemplatedMixin,
             EnhancedGrid, Pagination, ItemFileWriteStore,
             DataGrid, cells, cellsDijit, Memory, ObjectStore, locale, currency,
             DateTextBox, CurrencyTextBox, HorizontalSlider, JsonRest) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: '<div></div>',

        postCreate: function () {
            var domNode = this.domNode,
                configStore = this.config;

            function formatCurrency(inDatum) {
                return isNaN(inDatum) ? '...' : currency.format(inDatum, this.constraint);
            }

            function formatDate(inDatum) {
                return locale.format(new Date(inDatum), this.constraint);
            }

            gridLayout = [{
                defaultCell: {
                    width: 10,
                    editable: true,
                    type: cells._Widget,
                    styles: 'text-align: right;',
                    noscroll: true
                },
                cells: configStore
            }];

            var data = [
                {
                    id: 0,
                    col1: "normal",
                    col2: false,
                    col3: "new",
                    col4: 'But are not followed by two hexadecimal',
                    col5: 29.91,
                    col6: 10,
                    col7: false,
                    col8: new Date()
                },
                {
                    id: 1,
                    col1: "important",
                    col2: false,
                    col3: "new",
                    col4: 'Because a % sign always indicates',
                    col5: 9.33,
                    col6: -5,
                    col7: false,
                    col8: new Date()
                },
                {
                    id: 2,
                    col1: "important",
                    col2: false,
                    col3: "read",
                    col4: 'Signs can be selectively',
                    col5: 19.34,
                    col6: 0,
                    col7: true,
                    col8: new Date()
                },
                {
                    id: 3,
                    col1: "note",
                    col2: false,
                    col3: "read",
                    col4: 'However the reserved characters',
                    col5: 15.63,
                    col6: 0,
                    col7: true,
                    col8: new Date()
                },
                {
                    id: 4,
                    col1: "normal",
                    col2: false,
                    col3: "replied",
                    col4: 'It is therefore necessary',
                    col5: 24.22,
                    col6: 5.50,
                    col7: true,
                    col8: new Date()
                },
                {
                    id: 5,
                    col1: "important",
                    col2: false,
                    col3: "replied",
                    col4: 'To problems of corruption by',
                    col5: 9.12,
                    col6: -3,
                    col7: true,
                    col8: new Date()
                },
                {
                    id: 6,
                    col1: "note",
                    col2: false,
                    col3: "replied",
                    col4: 'Which would simply be awkward in',
                    col5: 12.15,
                    col6: -4,
                    col7: false,
                    col8: new Date()
                }
            ];

            var jsonStore = new JsonRest({
                target: ngwConfig.applicationUrl + '/compulink/services/reference_books/region/'
            });

            // global var "test_store"
            test_store = new ObjectStore({objectStore: jsonStore});

            /*create a new grid:*/
            var grid = new EnhancedGrid({
                id: 'grid',
                // store: test_store,
                structure: gridLayout,
                escapeHTMLInData: false,
                'class': 'grid',
                height: '400px',
                rowSelector: '20px',
                plugins: {
                    pagination: {
                        pageSizes: [25, 50, 100],
                        defaultPageSize: 25,
                        description: true,
                        sizeSwitch: true,
                        pageStepper: true,
                        gotoButton: true,
                        maxPageStep: 4,
                        position: "bottom"
                    }
                }
            }, document.createElement('div'));

            grid.doApplyCellEdit = function (inValue, inRowIndex, inAttrName) {
                this.store.fetchItemByIdentity({
                    identity: this._by_idx[inRowIndex].idty,
                    onItem: lang.hitch(this, function (item) {
                        var oldValue = this.store.getValue(item, inAttrName);
                        if (typeof oldValue == 'number') {
                            inValue = isNaN(inValue) ? inValue : parseFloat(inValue);
                        } else if (typeof oldValue == 'boolean') {
                            inValue = inValue == 'true' ? true : inValue == 'false' ? false : inValue;
                        } else if (oldValue instanceof Date) {
                            var asDate = new Date(inValue);
                            inValue = isNaN(asDate.getTime()) ? inValue : asDate;
                        }
                        this.store.setValue(item, inAttrName, inValue);
                        this.onApplyCellEdit(inValue, inRowIndex, inAttrName);
                        this.store.save();
                    })
                });
            };

            grid._setStore = function (store) {
                if (this.store && this._store_connects) {
                    array.forEach(this._store_connects, this.disconnect, this);
                }
                this.store = store;

                if (this.store) {
                    var f = this.store.getFeatures();
                    var h = [];

                    this._canEdit = !!f["dojo.data.api.Write"] && !!f["dojo.data.api.Identity"];
                    this._hasIdentity = !!f["dojo.data.api.Identity"];

                    if (!!f["dojo.data.api.Notification"] && !this.items) {
                        h.push(this.connect(this.store, "onSet", "_onSet"));
                        h.push(this.connect(this.store, "onNew", "_onNew"));
                        h.push(this.connect(this.store, "onDelete", "_onDelete"));
                    }
                    if (this._canEdit) {
                        h.push(this.connect(this.store, "revert", "_onRevert"));
                    }

                    this._store_connects = h;
                }
            };

            grid.setStore(test_store);

            /*append the new grid to the div*/
            domNode.appendChild(grid.domNode);

            /*Call startup() to render the grid*/
            grid.startup();
        }
    });
});
