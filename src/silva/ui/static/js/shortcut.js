
/**
 * A ShortcutManager let you bind, unbind, rebind collection of
 * shortcuts.
 */
var ShortcutManager = function() {
    this._shortcuts = {};
    this._zones = {};
    this._order = [];
    this._selected = 0;

    this.bootstrap();
};


(function ($) {

    var shift_nums = {
        "`":"~",
        "1":"!",
        "2":"@",
        "3":"#",
        "4":"$",
        "5":"%",
        "6":"^",
        "7":"&",
        "8":"*",
        "9":"(",
        "0":")",
        "-":"_",
        "=":"+",
        ";":":",
        "'":"\"",
        ",":"<",
        ".":">",
        "/":"?",
        "\\":"|"
    };

    var special_keys = {
        'esc':27,
        'escape':27,
        'tab':9,
        'space':32,
        'return':13,
        'enter':13,
        'backspace':8,

        'scrolllock':145,
        'scroll':145,
        'capslock':20,
        'caps':20,
        'numlock':144,

        'pause':19,
        'break':19,

        'insert':45,
        'home':36,
        'delete':46,
        'end':35,

        'pageup':33,

        'pagedown':34,

        'left':37,
        'up':38,
        'right':39,
        'down':40,

        'f1':112,
        'f2':113,
        'f3':114,
        'f4':115,
        'f5':116,
        'f6':117,
        'f7':118,
        'f8':119,
        'f9':120,
        'f10':121,
        'f11':122,
        'f12':123
    };

    var create_handler = function(shortcut, callback) {
        var keys = shortcut.toLowerCase().split('+');

        return function(e) {
            e = e || window.event;

            //Find Which key is pressed
            var code = null;
            if (e.keyCode) {
                code = e.keyCode;
            } else if (e.which) {
                code = e.which;
            };

            var character = String.fromCharCode(code).toLowerCase();
            if(code == 188) character=","; //If the user presses , when the type is onkeydown
            if(code == 190) character="."; //If the user presses , when the type is onkeydown

            //Key Pressed - counts the number of valid keypresses - if
            //it is same as the number of keys, the shortcut function
            //is invoked
            var kp = 0;

            var modifiers = {
                shift: { wanted:false, pressed:false},
                ctrl : { wanted:false, pressed:false},
                alt  : { wanted:false, pressed:false},
                meta : { wanted:false, pressed:false}   //Meta is Mac specific
            };

            if(e.ctrlKey)   modifiers.ctrl.pressed = true;
            if(e.shiftKey)  modifiers.shift.pressed = true;
            if(e.altKey)    modifiers.alt.pressed = true;
            if(e.metaKey)   modifiers.meta.pressed = true;

            for(var i=0,k=null; k=keys[i],i<keys.length; i++) {
                //Modifiers
                if(k == 'ctrl' || k == 'control') {
                    kp++;
                    modifiers.ctrl.wanted = true;
                } else if(k == 'shift') {
                    kp++;
                    modifiers.shift.wanted = true;
                } else if(k == 'alt') {
                    kp++;
                    modifiers.alt.wanted = true;
                } else if(k == 'meta') {
                    kp++;
                    modifiers.meta.wanted = true;
                } else if(k.length > 1) { //If it is a special key
                    if(special_keys[k] == code)
                        kp++;
                } else { //The special keys did not match
                    if(character == k)
                        kp++;
                    else {
                        if(shift_nums[character] && e.shiftKey) {
                            character = shift_nums[character];
                            if(character == k) kp++;
                        };
                    };
                };
            };

            if(kp == keys.length &&
               modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
               modifiers.shift.pressed == modifiers.shift.wanted &&
               modifiers.alt.pressed == modifiers.alt.wanted &&
               modifiers.meta.pressed == modifiers.meta.wanted) {

                if(!callback(e)) {
                    //Stop the event
                    //e.cancelBubble is supported by IE - this will kill the bubbling process.
                    e.cancelBubble = true;
                    e.returnValue = false;

                    //e.stopPropagation works in Firefox.
                    if (e.stopPropagation) {
                        e.stopPropagation();
                        e.preventDefault();
                    };
                    return false;
                };
            };
        };
    };

    var activate_handler = function(node, handler) {
        node = node.get(0);
        if(node.addEventListener)
            node.addEventListener('keypress', handler, false);
        else if(node.attachEvent)
            node.attachEvent('onkeypress', handler);
        else
            node['onkeypress'] = handler;
    };

    var desactivate_handler = function(node, handler) {
        node = node.get(0);
        if(node.detachEvent)
            node.detachEvent('onkeypress', handler);
        else if(node.removeEventListener)
            node.removeEventListener('keypress', handler, false);
        else
            node['onkeypress'] = false;
    };

    ShortcutManager.prototype.bootstrap = function () {
        var make_unselect = function(direction) {
            return function() {
                if (this._order.length) {
                    this.disable();

                    this._selected = (this._selected + direction) % this._order.length;
                    if (this._selected < 0) {
                        this._selected = this._order.length - 1;
                    };

                    this.activate();
                    var zone = this.get_current_zone();
                    zone.addClass('highlight');
                    setTimeout(function() {zone.removeClass('highlight');}, 500);
                    return false;
                };
                return true;
            }.scope(this);
        }.scope(this);
        activate_handler($(document), create_handler('ctrl+shift+left', make_unselect(-1)));
        activate_handler($(document), create_handler('ctrl+shift+right', make_unselect(1)));
        activate_handler($(document), create_handler('ctrl+left', make_unselect(-1)));
        activate_handler($(document), create_handler('ctrl+right', make_unselect(1)));
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
    ShortcutManager.prototype.get_current_shortcuts = function() {
        var current = this.get_current_name();

        if (current) {
            return this._shortcuts[current];
        };
        return {};
    };

    ShortcutManager.prototype.create = function(name, zone) {
        if (this._zones[name] === undefined) {
            this._zones[name] = zone;
            this._order.push(name);
            this._shortcuts[name] = {};
        };
    };

    ShortcutManager.prototype.remove = function(name) {
        if (this._zones[name] !== undefined) {
            if (this.get_current_name() == name) {
                this._selected = 0;
            }
            this._order.splice(this._order.indexOf(name), 1);
            delete this._zones[name];
            delete this._shortcuts[name];
        };
    };

    /**
     * Bind a shortbut to a key
     * @param name: name of the collection
     * @param key: shortcut key
     * @param callback: callback to execute
     */
    ShortcutManager.prototype.bind = function(name, shortcut, callback) {
        this._shortcuts[name][shortcut] = create_handler(shortcut, callback);
        if (this.get_current_name() == name) {
            activate_handler(this.get_current_zone(), this._shortcuts[name][shortcut]);
        };
    };

    /**
     * Unbind a shortcut.
     * @param key: shortcut key
     */
    ShortcutManager.prototype.unbind = function(name, shortcut) {
        if (this.shortcuts[name][shortcut]) {
            if (this.get_current_name() == name) {
                desactivate_handler(this.get_current_zone(), this._shortcuts[name][shortcut]);
            };
            delete this._shortcuts[name][shortcut];
        };
    };

    /**
     * Activate the current shortcut collection.
     */
    ShortcutManager.prototype.activate = function() {
        var shortcuts = this.get_current_shortcuts();
        var zone = this.get_current_zone();

        zone.addClass('focus');
        zone.trigger('focus-smi');
        for (var key in shortcuts) {
            activate_handler(zone, shortcuts[key]);
        };
    };

    /**
     * Disable the current shortcut collection.
     */
    ShortcutManager.prototype.disable = function() {
        var shortcuts = this.get_current_shortcuts();
        var zone = this.get_current_zone();

        for (var key in shortcuts) {
            desactivate_handler(zone, shortcuts[key]);
        };
        zone.trigger('blur-smi');
        zone.removeClass('focus');
    };

})(jQuery);
