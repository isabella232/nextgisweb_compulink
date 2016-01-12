<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<% import json %>

<link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
      rel="stylesheet" type="text/css"/>

<script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

<script>
    var columnsSettings = null;
    require([
        'ngw-compulink-admin/reference_books/RelationSelect',
        'ngw-compulink-admin/reference_books/BuildingObjectsRelationSelect',
        'dojo/parser',
        'dojo/ready'
    ], function (RelationSelect, BuildingObjectsRelationSelect, parser, ready) {
        ready(function () {
            columnsSettings = ${columnsSettings | n};
            parser.parse();
        });
    });
</script>


<div data-dojo-type="ngw-compulink-admin/reference_books/Projects"
     data-dojo-props="config: columnsSettings"></div>