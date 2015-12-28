<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<script>
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