

(function ($) {
    $(document).ready(function () {
        // Add a loading message on server request
        var count = 0;
        var message = $('div#loading-message');

        if (message) {
            $(document).ajaxSend(function() {
                if (!count) {
                    message.fadeIn('fast');
                };
                count += 1;
            });
            $(document).ajaxComplete(function() {
                count -= 1;
                if (!count) {
                    message.fadeOut('fast');
                };
            });
        };
    });
})(jQuery);


(function($) {
    var HASH_REGEXP = /#([^!]*)!?(.*)/;

    // Add a rescope method
    if (Function.prototype.scope === undefined) {
        Function.prototype.scope = function(scope) {
            var _function = this;

            return function() {
                return _function.apply(scope, arguments);
            };
        };
    }

    /**
     * A ShortcutManager let you bind, unbind, rebind collection of
     * shortcuts.
     */
    var ShortcutManager = function () {
        this.shortcuts = {default: []};
        this.current = 'default';
        this.activated = true;
    };

    /**
     * Bind a shortbut to a key.
     * @param key: shortcut key
     * @param callback: callback to execute
     */
    ShortcutManager.prototype.bind = function(key, callback) {
        if (this.activated) {
            shortcut.add(key, callback);
        };
        this.shortcuts[this.current][key] = callback;
    };

    /**
     * Unbind a shortcut.
     * @param key: shortcut key
     */
    ShortcutManager.prototype.unbind = function(key) {
        if (this.shortcuts[this.current][key]) {
            if (this.activated) {
                shortcut.remove(key);
            };
            delete this.shortcuts[this.current][key];
        }
    };

    /**
     * Switch active shortcuts to a new or existing collection.
     * @param name: shortcut collection
     */
    ShortcutManager.prototype.switch = function(name) {
        if (name != this.current) {
            this.disable();
            this.current = name;
            if (this.shortcuts[name] == undefined) {
                this.shortcuts[name] = {};
            };
            this.activate();
        }
    };

    /**
     * Activate the current shortcut collection.
     */
    ShortcutManager.prototype.activate = function() {
        if (!this.activated) {
            var collection = this.shortcuts[this.current];

            for (key in collection) {
                shortcut.add(key, collection[key]);
            };
            this.activated = true;
        };
    };

    /**
     * Disable the current shortcut collection.
     */
    ShortcutManager.prototype.disable = function() {
        if (this.activated) {
            var collection = this.shortcuts[this.current];

            for (key in collection) {
                shortcut.remove(key);
            };
            this.activated = false;
        };
    };

    /**
     * Notification implement a notification.
     * @param container: container to insert notification.
     * @param messags: message used to render the notification.
     */
    var Notification = function(container, message) {
        var notification = $('<div class="notification"></div>');
        var timer = null;

        if (typeof(message.title) == 'string') {
            notification.prepend('<h3>' + message.title + '</h3>');
        };
        if (typeof(message.message) == 'string') {
            notification.append('<p>' + message.message + '</p>');
        };
        if (typeof(message.category) == 'string') {
            notification.addClass(message.category);
        };

        // Bind the close event
        notification.bind('close.notification', function() {
            // Disable timeout if dialog is closed
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            };
            notification.animate({ height:0, opacity:0 }, 'slow', function() {
                notification.remove();
            });
        });

        // Close and autoclose
        notification.bind('click', function() {
            notification.trigger('close.notification');
        });
        if(typeof message.autoclose == 'number') {
            timer = setTimeout(function() {
                notification.trigger('close.notification');
            }, message.autoclose);
        };

        container.append(notification);
    };

    /**
     * NotificationManager manage notifications
     * @param options: configuration options.
     */
    var NotificationManager = function(options) {
        this.container = $(options.selector);

        // Listen to pull notification events.
        $(document).bind('refresh-feedback.smi', function() {
            $.getJSON(options.url, function(messages) {
                this.notifies(messages);
            }.scope(this));
        }.scope(this));
    };

    /**
     * Notify of a new notification
     * @param message: message.
     */
    NotificationManager.prototype.notify = function(message) {
        new Notification(this.container, message);
    };

    /**
     * Notify a list of new notifications
     * @param messages: list of messages.
     */
    NotificationManager.prototype.notifies = function(message) {
        $.each(messages, function(i, message) {
            this.notify(message);
        }.scope(this));
    };


    var SMI = function(options) {
        var navigation = $(options.navigation.selector);
        var workspace = $(options.workspace.selector);
        var header = $(options.header.selector);

        this._ = {};
        this._.url = jsontemplate.Template(options.url, {});
        this._.workspace = workspace;
        this._.navigation = navigation;

        this.opened = {path: '', tab: ''};
        this.options = options;
        this.shortcuts = new ShortcutManager();
        this.notifications = new NotificationManager(options.notifications);

        header.disableTextSelect();
        navigation.SMINavigation(this, options.navigation);

        this.workspace = workspace.SMIWorkspace(this, options.workspace);

        // Bind keys to switch focus between navigation and workspace
        // XXX: doesn't work for Sylvain
        $(document).bind('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey) {
                navigation.addClass('highlight');
                workspace.addClass('highlight');
                if (e.keyCode == 37) {
                    workspace.trigger('blur.smi');
                    navigation.trigger('focus.smi');
                } else if (e.keyCode == 39) {
                    navigation.trigger('blur.smi');
                    workspace.trigger('focus.smi');
                }
            }
        });
        $(document).bind('keyup', function(e) {
            if (e.keyCode == 16 || e.keyCode == 17) {
                navigation.removeClass('highlight');
                workspace.removeClass('highlight');
            }
        });

        // By default, navigation is blue and workspace is focus
        navigation.trigger('blur.smi');
        workspace.trigger('focus.smi');

        // Bind the hash change used by open
        $(window).hashchange(function(event, data) {
            this._load(data.after);
        }.scope(this));

        // Bind event to open new tab
        $('a.screen').live('click', function(event) {
            var link = $(event.target);
            var path = link.attr('href');

            if (!path) {
                path = this.opened.path;
            }
            this.open(path, link.attr('rel'));
            return false;
        }.scope(this));

        // Bind click on header logo bring back to root
        header.find('a.home').bind('click', function(event) {
            this.open('/');
        }.scope(this));

        // Plugins initialization
        $(document).trigger('load.smiplugins', this);

        // Open the current location.
        this._load(document.location.hash);
    };

    /**
     * Open a content tab for the content located on the given
     * path. If tab is not provided, open the content tab.
     *
     * @param path: path to the content to open.
     * @param tab: tab name to open on the content.
     */
    SMI.prototype.open = function(path, tab) {
        if (tab == undefined) {
            tab = 'content';
        };
        document.location.hash = tab + '!' + path;
    };

    /**
     * Retrieve the language used by the SMI.
     */
    SMI.prototype.get_language = function() {
        var lang = $('html').attr('lang');

        if (!lang) {
            lang = 'en';
        };
        return lang;
    };

    // Open a screen from a hash tag.
    SMI.prototype._load = function(hash) {
        var parts = HASH_REGEXP.exec(hash);

        if (parts) {
            this.opened = {tab: parts[1], path: parts[2]};
        } else {
            this.opened = {tab: '', path: ''};
        }

        if (!this.opened.tab.length) {
            this.opened.tab = 'content';
        };
        $.getJSON(this._.url.expand(this.opened),function(data) {
            this._.workspace.trigger('content.smi', data);
            this._.navigation.trigger('content.smi', data);
        }.scope(this));
    };

    /**
     * JQuery SMI loader
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
            }
        };
        if(methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if(typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
    };
})(jQuery, shortcut);

