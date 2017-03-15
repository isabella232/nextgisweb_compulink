<%inherit file='nextgisweb:templates/base.mako' />



<h2>Настройки видео</h2>

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-compulink-video-producer/AudioSettingsForm",
             "dojo/domReady!"
        ], function (
            AudioSettingsForm
        ) {
            (new AudioSettingsForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>
<div id="main_toaster"></div>