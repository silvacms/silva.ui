
(function($) {
    var HASH_REGEXP = /#(.*)/;

    var SMI = function(options) {
        var navigation = $(options.navigation.selector);
        var content = $(options.content.selector);
        var header = $(options.header.selector);
        var url = jsontemplate.Template(options.template, {});

        this.options = options;
        header.disableTextSelect();
        navigation.SMINavigation(this, options.navigation);

        this.content = content.SMIContent(options.contents);

        // Bind keys to switch focus between navigation and content
        // XXX: doesn't work for Sylvain
        $(document).bind('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey) {
                navigation.addClass('highlight');
                content.addClass('highlight');
                if (e.keyCode == 37) {
                    content.trigger('smi.blur');
                    navigation.trigger('smi.focus');
                } else if (e.keyCode == 39) {
                    navigation.trigger('smi.blur');
                    content.trigger('smi.focus');
                }
            }
        });
        $(document).bind('keyup', function(e) {
            if (e.keyCode == 16 || e.keyCode == 17) {
                navigation.removeClass('highlight');
                content.removeClass('highlight');
            }
        });

        // By default, navigation is blue and content is focus
        navigation.trigger('smi.blur');
        content.trigger('smi.focus');

        // Bind the hash change
        $(window).hashchange(function(e, data) {
            var parts = HASH_REGEXP.exec(data.after);

            if (parts) {
                $.getJSON(
                    url.expand({path: parts[1]}),
                    function(data) {
                        content.trigger('smi.content', data);
                        navigation.trigger('smi.content', data);
                    });
            };
        });
    };

    SMI.prototype.open = function(path, tab) {
        var hash = path;

        if (tab != undefined) {
            hash = hash + '|' + tab;
        };
        document.location.hash = hash;
    };

    /**
     * Main SMI loader
     */
    $.fn.SMI = function(method) {

        var methods = {
            init: function(options) {
                return new SMI(options);
            },
            clipboard: function(action) {
                // Global clipboard
                var actions = {
                    cut: function($items) {
                        window.clipboard = $items;
                        $(this).trigger('smi.clipboard.cut', $items);
                        $SMI.SMINotification({
                            title: "Cut " + window.clipboard.length + " item(s)",
                            body: "The selected items are on the clipboard. Use the Paste action to paste the items from the clipboard. Cut items will not be moved until you paste them.",
                            autoclose: 5000
                        });
                    },
                    copy: function($items) {
                        window.clipboard = $items.clone();
                        $(this).trigger('smi.clipboard.copy', $items);
                        $SMI.SMINotification({
                            title: "Copied " + window.clipboard.length + " item(s)",
                            body: "The selected items have been copied. Use the Paste action to paste the copied items.",
                            autoclose: 5000
                        });
                    },
                    paste: function() {
                        var data = (window.clipboard) ? window.clipboard : [];
                        window.clipboard = null;
                        $(this).trigger('smi.clipboard.paste', data);
                        return data;
                    },
                    clear: function() {
                        window.clipboard = null;
                        $(this).trigger('smi.clipboard.clear');
                    },
                    length: function() {
                        $(this).trigger('smi.clipboard.length');
                        return (window.clipboard && window.clipboard.length) ? window.clipboard.length : 0;
                    }
                };
                if(actions[action]) {
                    return actions[action].apply(this, Array.prototype.slice.call(arguments, 1));
                }
            },
            keybind: function(triggers, fn) {
                $SMI.SMI('unbind', triggers);
                if (!window.hotkeys) {
                    window.hotkeys = {};
                }
                if (typeof(triggers) == 'string') {
                    triggers = [triggers];
                }
                $.each(triggers, function(i, trigger){
                    if (typeof(window.hotkeys[trigger]) != 'function') {
                        shortcut.add(trigger, fn);
                        window.hotkeys[trigger] = fn;
                    }
                });
            },
            unbind: function(triggers) {
                if (!window.hotkeys) return;
                if (typeof(triggers) == 'string') {
                    triggers = [triggers];
                }
                $.each(triggers, function(i, trigger){
                    if (typeof(window.hotkeys[trigger]) == 'function') {
                        shortcut.remove(trigger);
                        window.hotkeys[trigger] = null;
                    }
                });
            },
            bindonce: function(triggers, fn) {
                if (!window.hotkeys) return;
                if (typeof(triggers) == 'string') {
                    triggers = [triggers];
                }
                $.each(triggers, function(i, trigger){
                    var oldfn = $SMI.SMI('getbind', trigger);
                    var newfn = function() {
                        fn();
                        if (oldfn) {
                            $SMI.SMI('keybind', trigger, oldfn);
                        }
                    };
                    $SMI.SMI('keybind', trigger, newfn);
                });
            },
            getbind: function(trigger) {
                var fn = window.hotkeys[trigger];
                return ($.isFunction(fn)) ? fn : null;
            },
            getbinds: function() {
                return (window.hotkeys) ? window.hotkeys : {};
            }
        };
        if(methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if(typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
    };
})(jQuery);
