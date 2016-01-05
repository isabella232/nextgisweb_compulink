<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<% import json %>

<script>
    var columnsSettings = ${columnsSettings | json.dumps, n};
    require([
        'dojo/parser',
        'dojo/ready'
    ], function (parser, ready) {
        ready(function () {
            parser.parse();
        });
    });
</script>


<h1>${title}</h1>

<div data-dojo-type="ngw-compulink-admin/reference_books/Districts"
     data-dojo-props="config: columnsSettings"></div>