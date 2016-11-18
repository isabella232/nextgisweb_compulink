define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/Evented',
    'dojo/Deferred',
    'dojo/store/Memory',
    'dojox/dtl/_base',
    'dojo/request/xhr',
    './_BaseStore'
], function (declare, lang, array, on, topic, Evented, Deferred, Memory, dtlBase, xhr, _BaseStore) {
    return declare([_BaseStore], {
        LAYER_TYPE: 'accepted_part',

        getLayerInfo: function (layerType, constructObjectId) {
            var ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    layerType: layerType,
                    constructObjectId: constructObjectId
                }),
                url = ngwApplicationUrl + this.GET_LAYER_INFO.render(dtlContext);

            return xhr.get(url, {
                handleAs: 'json'
            });
        },

        URL: new dtlBase.Template('/compulink/accepted-parts/{{constructObjectId}}/accepted-part/{{acceptedPartId}}', true),
        createAcceptedPart: function (acceptedPart) {
            var ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    constructObjectId: this._constructObjectId,
                    acceptedPartId: 1
                }),
                url = ngwApplicationUrl + this.URL.render(dtlContext);

            xhr(url, {
                handleAs: 'json',
                method: 'PUT',
                data: acceptedPart
            }).then(lang.hitch(this, function (result) {
                this.fetch(this._constructObjectId);
            }));
        },

        modifyAcceptedPart: function (acceptedPart) {
            var ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    constructObjectId: this._constructObjectId,
                    acceptedPartId: acceptedPart.id
                }),
                url = ngwApplicationUrl + this.URL.render(dtlContext);

            xhr(url, {
                handleAs: 'json',
                method: 'POST',
                data: acceptedPart
            }).then(lang.hitch(this, function (result) {
                this.fetch(this._constructObjectId);
            }));
        },

        deleteAcceptedPart: function (acceptedPartId) {
            var deferred = new Deferred(),
                ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    constructObjectId: this._constructObjectId,
                    acceptedPartId: acceptedPartId
                }),
                url = ngwApplicationUrl + this.URL.render(dtlContext);

            xhr(url, {
                handleAs: 'json',
                method: 'DELETE',
                data: {
                    id: acceptedPartId
                }
            }).then(lang.hitch(this, function (result) {
                this.fetch(this._constructObjectId);
                deferred.resolve(result);
            }), lang.hitch(this, function (result) {
                deferred.reject(result);
            }));

            return deferred.promise;
        },

        getAttributesStore: function () {
            var memory = new Memory(),
                feature;
            array.forEach(this.query(), function (ngwFeature) {
                feature = ngwFeature.fields;
                feature.attachment = ngwFeature.extensions.attachment;
                feature.id = ngwFeature.id;
                memory.add(feature);
            });
            return memory;
        },

        getAcceptedPartAttributes: function (acceptedPartId) {
            var acceptedPart = this.query({id: acceptedPartId})[0],
                attributes;
            attributes = acceptedPart.fields;
            attributes.attachment = acceptedPart.extensions.attachment;
            attributes.id = acceptedPart.id;
            return attributes;
        }
    });
});