<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <%
        import os
        import json
        from bunch import Bunch
    %>
<head>

    <title>
        %if hasattr(self, 'title'):
        ${self.title()} ::
        %endif

        ${request.env.core.settings['system.name']}
    </title>

    <link href="${request.static_url('nextgisweb:static/css/pure-0.4.2-min.css')}"
          rel="stylesheet" type="text/css"/>

    <link href="${request.static_url('nextgisweb:static/css/layout.css')}"
          rel="stylesheet" type="text/css"/>

    <link href="${request.static_url('nextgisweb:static/css/default.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.static_url('nextgisweb:static/css/icon.css')}"
          rel="stylesheet" type="text/css" media="screen"/>

    <link href="${request.route_url('amd_package', subpath='dijit/themes/claro/claro.css')}"
          rel="stylesheet" media="screen"/>

    <script type="text/javascript">
        var ngwConfig = {
            applicationUrl: ${request.application_url | json.dumps, n},
            compulinkAssetUrl: ${request.static_url('nextgisweb_compulink:compulink_site/static/') | json.dumps, n},
            assetUrl: ${request.static_url('nextgisweb:static/') | json.dumps, n },
            amdUrl: ${request.route_url('amd_package', subpath="") | json.dumps, n}
        };

        var dojoConfig = {
            async: true,
            isDebug: true,
            baseUrl: ${request.route_url('amd_package', subpath="dojo") | json.dumps, n}
        };

        var headerData = {
            <% settings = request.env.pyramid.settings %>
            %if 'logo' in settings and os.path.isfile(settings['logo']):
                srcLogo: '${request.route_url('pyramid.logo')}',
            %else:
                srcLogo: '${request.static_url('nextgisweb_compulink:compulink_site/static/img/cl_logo.png')}',
            %endif
            appUrl: '${request.application_url}',
            fullName: '${request.env.core.settings['system.full_name']}',
            %if request.route_url('resource.root'):
                isAdm: true,
                rootPan: '${request.route_url('resource.root')}',
            %else:
                isAdm: false,
            %endif
            %if request.user.keyname == 'guest':
                loginUrl: '${request.route_url('auth.login')}',
                isGuest: true
            %else:
                isGuest: false,
                userName: '${request.user}',
                logoutUrl: '${request.route_url('auth.logout')}',
                reportUrl: '${request.route_url('compulink.reporting.status_grid')}'
            %endif
        }
    </script>

    <script src="${request.route_url('amd_package', subpath='dojo/dojo.js')}"></script>

    %if hasattr(self, 'assets'):
        ${self.assets()}
    %endif

    %if hasattr(self, 'head'):
        ${self.head()}
    %endif
</head>

<body class="claro">

    %if show_header==True:
        ${next.body()}
    %else:
        ${next.body()}
    %endif
</body>

</html>
