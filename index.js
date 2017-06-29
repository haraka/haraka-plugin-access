'use strict';

exports.register = function () {
    var plugin = this;
    plugin.load_access_ini();
}

exports.load_access_ini = function () {
    var plugin = this;

    plugin.cfg = plugin.config.get('access.ini', {
        booleans: [
            '+enabled',               // plugins.cfg.main.enabled=true
            '-disabled',              // plugins.cfg.main.disabled=false
            '+feature_section.yes'    // plugins.cfg.feature_section.yes=true
        ]
    },
    function () {
        plugin.load_example_ini();
    });
}
