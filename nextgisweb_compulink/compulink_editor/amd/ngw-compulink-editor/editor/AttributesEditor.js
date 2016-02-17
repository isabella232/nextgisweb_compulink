define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/html',
    'dojo/dom',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/promise/all',
    'dojo/topic',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'ngw/settings!compulink_site',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/AttributesEditorWrapper.mustache',
    'dojo/text!./templates/AttributesEditor.mustache',
    'xstyle/css!./templates/css/AttributesEditor.css',
    'dojox/dtl/tag/logic'
], function (declare, lang, array, html, dom, query, domClass, domConstruct, all, topic, _WidgetBase, _TemplatedMixin,
             siteSettings, mustache, templateWrapper, templateAttributes) {

    return declare([_WidgetBase, _TemplatedMixin], {
        _ngwServiceFacade: null,
        widgetsInTemplate: false,
        templateString: templateWrapper,
        templateAttributes: templateAttributes,

        constructor: function () {
            mustache.parse(this.templateString);
            mustache.parse(this.templateAttributes);
            this.bindEvents();
        },

        setNgwServiceFacade: function (ngwServiceFacade) {
            this._ngwServiceFacade = ngwServiceFacade;
        },

        bindEvents: function () {
            topic.subscribe('/editor/feature/select', lang.hitch(this, function (feature) {
                if (!this._ngwServiceFacade) return false;
                this._setEditorState('wait');
                var getFeatureInfo = this._ngwServiceFacade.getFeature(feature.ngwLayerId, feature.ngwFeatureId),
                    resourceInfo = this._ngwServiceFacade.getResourceInfo(feature.ngwLayerId);
                all([resourceInfo, getFeatureInfo]).then(lang.hitch(this, function (results) {
                    this.renderAttributes(results[0], results[1]);
                }));
            }));
        },

        _setEditorState: function (state) {
            var domNode = this.domNode;
            domClass.remove(domNode);
            domClass.add(domNode, state);
        },

        renderAttributes: function (resourceInfo, ngwFeatureInfo) {
            var viewModel = {
                    resource: resourceInfo.resource,
                    fields: []
                },
                viewModelField,
                layerFields = resourceInfo.feature_layer && resourceInfo.feature_layer.fields ?
                    resourceInfo.feature_layer.fields : null,
                divAttributes = query('div.attributes', this.domNode)[0],
                htmlContent;

            // TODO: need more flexible!
            var disabledFields = [
                'built_date', 'feat_guid', 'change_author', 'change_date',
                'is_deviation', 'deviation_distance', 'deviation_approved', 'approval_comment',
                'start_point'
            ];

            var all_dicts = siteSettings.dicts;
            var bool_fields = siteSettings.bool_fields;

            if (layerFields) {
                array.forEach(layerFields, function (field) {
                    if (ngwFeatureInfo.fields.hasOwnProperty(field.keyname)) {
                        var fieldValue = ngwFeatureInfo.fields[field.keyname];

                        if (field.datatype === 'DATETIME') {
                            fieldValue = new Date(fieldValue.year, fieldValue.month, fieldValue.day,
                                fieldValue.hour, fieldValue.minute, fieldValue.second);
                            fieldValue = fieldValue.toISOString().replace('Z', '');
                        }

                        var isDictField = false;
                        var isBoolField = false;
                        var valsDict = null;

                        if (all_dicts.hasOwnProperty(field.keyname)) {
                            isDictField = true;
                            valsDict = all_dicts[field.keyname];
                            fieldValue = [];
                            for (var keyname in valsDict) {
                                if (valsDict.hasOwnProperty(keyname)) {
                                    fieldValue.push({
                                        val: keyname,
                                        text: valsDict[keyname],
                                        selected: fieldValue === keyname
                                    });
                                }
                            }
                        }

                        if (bool_fields.indexOf(field.keyname) >= 0) {
                            isBoolField = true;
                        }

                        viewModelField = {
                            displayName: field.display_name,
                            keyname: field.keyname,
                            value: fieldValue,
                            valsDict: valsDict
                        };

                        viewModelField['IS_DISABLED'] = disabledFields.indexOf(field.keyname) > -1;

                        viewModelField['IS_REF_BOOK'] = isDictField;
                        viewModelField['IS_BOOL'] = isBoolField;

                        if (!isBoolField && !isDictField) {
                                viewModelField['IS_' + field.datatype] = true;
                        }

                        viewModel.fields.push(viewModelField);
                    }
                }, this);
            }

            htmlContent = mustache.render(this.templateAttributes, viewModel);
            this._setEditorState('fill');
            html.set(divAttributes, htmlContent);
        },

        _stringRepl: function (template) {
            return mustache.render(template, this);
        }
    });
});