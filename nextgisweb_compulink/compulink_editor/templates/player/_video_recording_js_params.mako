<% import json %>
<script>
    window.startPlayer = function () {};
    window.getPlayerState = function () {
        return 'initializing';
    };

    window.playerParams = ${json.dumps(player_parameters) | n};
</script>