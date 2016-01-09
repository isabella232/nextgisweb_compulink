<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<% import json %>

<script>
    var columnsSettings = null;
    require([
        'dojo/parser',
        'dojo/ready'
    ], function (parser, ready) {
        ready(function () {
            columnsSettings = ${columnsSettings | n};
            parser.parse();
        });
    });
</script>


<div data-dojo-type="ngw-compulink-admin/reference_books/Regions"
     data-dojo-props="config: columnsSettings"></div>