define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request/xhr',
    'dojox/dtl/_base'
], function (declare, lang, xhr, dtlBase) {
    return declare(null, {
        GET_ACCESS_LEVEL: new dtlBase.Template('/compulink/accepted-parts/{{constructObjectId}}/access_level', true),
        getAccessLevel: function (constructObjectId) {
            var ngwApplicationUrl = ngwConfig.applicationUrl,
                dtlContext = new dtlBase.Context({
                    constructObjectId: constructObjectId
                }),
                url = ngwApplicationUrl + this.GET_ACCESS_LEVEL.render(dtlContext);

            return xhr.get(url, {
                handleAs: 'json'
            });
        }
    });
});