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
            assetUrl: ${request.static_url('nextgisweb:static/') | json.dumps, n },
            amdUrl: ${request.route_url('amd_package', subpath="") | json.dumps, n}
        };

        var dojoConfig = {
            async: true,
            isDebug: true,
            baseUrl: ${request.route_url('amd_package', subpath="dojo") | json.dumps, n}
        };
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

        <div id="header" class="header">
            <div class="home-menu pure-menu pure-menu-open pure-menu-horizontal">

                <% settings = request.env.pyramid.settings %>
                %if 'logo' in settings and os.path.isfile(settings['logo']):
                    <img class="logo" src="${request.route_url('pyramid.logo')}"/>
                %endif

                <img class="logo" style=""
                     src="${request.static_url('nextgisweb_compulink:compulink_site/static/img/cl_logo.png')}">

                <a class="pure-menu-heading" href="${request.application_url}">
                    ${request.env.core.settings['system.full_name']}
                </a>

                <ul>
                    %if request.user.is_administrator:
                        <li><a href="${request.route_url('resource.root')}">Панель управления</a></li>
                    %endif

                    %if request.user.keyname == 'guest':
                        <li><a href="${request.route_url('auth.login')}">Вход</a></li>
                    %else:
                        <li class="user">${request.user}</li>
                        <li><a href="${request.route_url('auth.logout')}">Выход</a></li>
                    %endif
                </ul>
            </div>
        </div>

        ${next.body()}
    %else:
        ${next.body()}
    %endif
</body>

</html>
