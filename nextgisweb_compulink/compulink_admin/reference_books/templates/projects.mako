<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<% import json %>

<script>
    var columnsSettings = null;
    require([
        'ngw-compulink-admin/reference_books/RelationSelect',
        'dojo/parser',
        'dojo/ready'
    ], function (RelationSelect, parser, ready) {
        ready(function () {
            columnsSettings = ${columnsSettings | n};
            parser.parse();
        });
    });
</script>


<div data-dojo-type="ngw-compulink-admin/reference_books/Districts"
     data-dojo-props="config: columnsSettings"></div>