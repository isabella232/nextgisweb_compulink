define([
    'dojo/_base/window',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom',
    'dojo/query',
    'dojo/on',
    'dojo/topic',
    'ngw-compulink-libs/mustache/mustache',
    'dojo/text!./templates/VideoSection.mustache',
    'ngw-compulink-editor/player/utils/ButtonClickHandler'
], function (win, declare, lang, array, domConstruct, domClass, dom, query, on,
             topic, mustache, template, ButtonClickHandler) {
    return declare([], {
        initVideoSection: function (dialog) {
            var videoSectionHtml = mustache.render(template, {
                'state-init': true
            });
            $(dialog.domNode).find('div.video-section').one().replaceWith(videoSectionHtml);
        }
    })
});