<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<% import json %>

<script>
    var gridConfigStore = ${gridConfigStore | json.dumps, n};
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

<div data-dojo-type="ngw-compulink-admin/reference_books/Regions"
     data-dojo-props="config: gridConfigStore"></div>