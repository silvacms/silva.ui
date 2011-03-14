
/**
 * A ShortcutManager let you bind, unbind, rebind collection of
 * shortcuts.
 */
var ShortcutManager = function() {
    this._handlers = {};
    this._zones = {};
    this._order = [];
    this._selected = 0;

    this.bootstrap();
};


(function ($) {

    ShortcutManager.prototype.bootstrap = function () {
        var make_unselect = function(direction) {
            return function(event) {
                if (this._order.length) {
                    this.disable(true);

                    this._selected = (this._selected + direction) % this._order.length;
                    if (this._selected < 0) {
                        this._selected = this._order.length - 1;
                    };

                    this.activate(true);
                    var zone = this.get_current_zone();
                    zone.addClass('highlight');
                    setTimeout(function() {zone.removeClass('highlight');}, 1000);
                    return false;
                };
            }.scope(this);
        }.scope(this);
        $(document).bind('keydown', 'ctrl+shift+left', make_unselect(-1));
        $(document).bind('keydown', 'ctrl+shift+right', make_unselect(1));
        $(document).bind('keydown', 'ctrl+left', make_unselect(-1));
        $(document).bind('keydown', 'ctrl+right', make_unselect(1));
    };

    ShortcutManager.prototype.get_current_name = function () {
        if (this._order.length) {
            return this._order[this._selected];
        };
        return null;
    };

    ShortcutManager.prototype.get_current_zone = function() {
        var current = this.get_current_name();

        if (current) {
            return this._zones[current];
        };
        return null;
    };
    ShortcutManager.prototype.get_current_handlers = function() {
        var current = this.get_current_name();

        if (current) {
            return this._handlers[current];
        };
        return {};
    };

    ShortcutManager.prototype.create = function(name, zone) {
        if (this._zones[name] === undefined) {
            this._zones[name] = zone;
            this._order.push(name);
            this._handlers[name] = {};
        };
    };

    ShortcutManager.prototype.remove = function(name) {
        if (this._zones[name] !== undefined) {
            if (this.get_current_name() == name) {
                this.disable();
                this._selected = 0;
            }
            this._order.splice($.inArray(name, this._order), 1);
            delete this._zones[name];
            delete this._handlers[name];
        };
    };

    /**
     * Bind a shortbut to a key
     * @param name: name of the collection
     * @param key: shortcut key
     * @param callback: callback to execute
     */
    ShortcutManager.prototype.bind = function(name, key, callback) {
        this._handlers[name][key] = callback;
        if (this.get_current_name() == name) {
            $(document).bind('keydown', key, callback);
        };
    };

    /**
     * Unbind a shortcut.
     * @param key: shortcut key
     */
    ShortcutManager.prototype.unbind = function(name, key) {
        if (this._handlers[name][key]) {
            if (this.get_current_name() == name) {
                $(document).unbind('keydown', this._handlers[name][key]);
            };
            delete this._handlers[name][key];
        };
    };

    /**
     * Activate the current shortcut collection.
     */
    ShortcutManager.prototype.activate = function(event) {
        var handlers = this.get_current_handlers();
        var zone = this.get_current_zone();

        if (event) {
            $(document).focus();
            zone.addClass('focus');
            zone.trigger('focus-smi');
        };
        for (var key in handlers) {
            if (key)
                $(document).bind('keydown', key, handlers[key]);
        };
    };

    /**
     * Disable the current shortcut collection.
     */
    ShortcutManager.prototype.disable = function(event) {
        var handlers = this.get_current_handlers();
        var zone = this.get_current_zone();

        for (var key in handlers) {
            if (key)
                $(document).unbind('keydown', handlers[key]);
        };
        if (event) {
            zone.trigger('blur-smi');
            zone.removeClass('focus');
        };
    };

})(jQuery);
