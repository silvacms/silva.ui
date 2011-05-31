

(function (infrae, $) {

    /**
     * A ShortcutManager let you bind, unbind, rebind collection of
     * shortcuts.
     */
    var module = {
        ShortcutManager: function() {
            var handlers = {};
            var zones = {};
            var order = [];
            var selected = 0;
            var active = false;

            var current_name = function () {
                if (order.length) {
                    return order[selected];
                };
                return null;
            };
            var current_zone = function() {
                var current = current_name();

                if (current) {
                    return zones[current];
                };
                return null;
            };
            var current_handlers = function() {
                var current = current_name();

                if (current) {
                    return handlers[current];
                };
                return {};
            };


            var manager = {
                create: function(name, zone, select) {
                    if (zones[name] == undefined) {
                        zones[name] = zone;
                        order.push(name);
                        handlers[name] = {};
                        if (select) {
                            manager.disable(true);
                            selected = order.length - 1;
                            manager.activate();
                        };
                    };
                },
                remove: function(name) {
                    if (zones[name] != undefined) {
                        if (current_name() == name) {
                            manager.disable();
                            selected = 0;
                        }
                        order.splice($.inArray(name, order), 1);
                        delete zones[name];
                        delete handlers[name];
                    };
                },
                /**
                 * Bind a shortbut to a key
                 * @param name: name of the collection
                 * @param key: shortcut key
                 * @param callback: callback to execute
                 */
                bind: function(name, keys, callback) {
                    var is_current = (current_name() == name);

                    for (var i=0; i < keys.length; i++) {
                        var key = keys[i];
                        handlers[name][key] = callback;
                        if (is_current)
                            $(document).bind('keydown', key, callback);
                    };
                },
                /**
                 * Unbind a shortcut.
                 * @param key: shortcut key
                 */
                unbind: function(name, key) {
                    if (handlers[name][key]) {
                        if (current_name() == name)
                            $(document).unbind('keydown', handlers[name][key]);
                        delete handlers[name][key];
                    };
                },
                /**
                 * Activate the current shortcut collection.
                 */
                activate: function(event) {
                    if (!active) {
                        var handlers = current_handlers();
                        var zone = current_zone();

                        if (event) {
                            $(document).focus();
                            zone.addClass('focus');
                            zone.trigger('focus-keyboard');
                        };
                        for (var key in handlers)
                            if (key)
                                $(document).bind('keydown', key, handlers[key]);
                        active = true;
                    };
                },
                /**
                 * Disable the current shortcut collection.
                 */
                disable: function(event) {
                    if (active) {
                        var handlers = current_handlers();
                        var zone = current_zone();

                        for (var key in handlers)
                            if (key)
                                $(document).unbind('keydown', handlers[key]);
                        if (event) {
                            zone.trigger('blur-keyboard');
                            zone.removeClass('focus');
                        };
                        active = false;
                    }
                }
            };

            var make_switcher = function(direction) {
                return function(event) {
                    if (order.length) {
                        manager.disable(true);

                        selected = (selected + direction) % order.length;
                        if (selected < 0) {
                            selected = order.length - 1;
                        };

                        manager.activate(true);
                        var zone = current_zone();
                        zone.addClass('highlight');
                        setTimeout(function() {zone.removeClass('highlight');}, 1000);
                        return false;
                    };
                };
            };
            $(document).bind('keydown', 'ctrl+shift+left', make_switcher(-1));
            $(document).bind('keydown', 'ctrl+shift+right', make_switcher(1));
            $(document).bind('keydown', 'ctrl+left', make_switcher(-1));
            $(document).bind('keydown', 'ctrl+right', make_switcher(1));

            return manager;
        }
    };

    infrae.keyboard = module;

})(infrae, jQuery);
