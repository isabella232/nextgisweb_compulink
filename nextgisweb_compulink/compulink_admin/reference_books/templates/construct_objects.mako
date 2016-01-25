<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<% import json %>

<link href="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jstree-3.0.9/themes/default/style.css')}"
      rel="stylesheet" type="text/css"/>

<style>
    .dgrid-grid {
        width: 100%
    }

    .dgrid-cell {
        width: 200px;
    }
</style>

<script src="${request.static_url('nextgisweb_compulink:compulink_site/static/js/jquery-1.11.2/jquery.js')}"></script>

<script>
    var columnsSettings = null;
    require([
        'ngw-compulink-admin/reference_books/RelationSelect',
        'ngw-compulink-admin/reference_books/RegionSelect',
        'ngw-compulink-admin/reference_books/BuildingObjectsRelationSelect',
        'dijit/form/DateTextBox',
        'dojo/parser',
        'dojo/ready'
    ], function (RelationSelect, RegionSelect, BuildingObjectsRelationSelect,
                 DateTextBox, parser, ready) {
        ready(function () {
            columnsSettings = ${columnsSettings | n};
            parser.parse();
        });
    });
</script>


<div data-dojo-type="ngw-compulink-admin/reference_books/ConstructObjects"
     data-dojo-props="config: columnsSettings"></div>