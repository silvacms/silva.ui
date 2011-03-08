

(function ($) {
    $(document).ready(function () {
        // Add a loading message on server request
        var count = 0;
        var message = $('div#loading-message');

        if (message) {
            $('body').ajaxSend(function() {
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

(function ($) {
    $(document).ready(function(){
        // jQueryUI styling: this changes icon style on hover
        $('a.ui-state-default').live('mouseenter', function() {
            var context = $(this);
            context.removeClass('ui-state-default');
            context.addClass('ui-state-active');
        });
        $('a.ui-state-active').live('mouseleave', function() {
            var context = $(this);
            context.removeClass('ui-state-active');
            context.addClass('ui-state-default');
        });
    });
})(jQuery);


(function($, obviel, shortcut) {
    var HASH_REGEXP = /#([^!]*)!?(.*)/;

    obviel.view({
        iface: 'redirect',
        render: function() {
            this.smi.open_screen(this.data.path, this.data.tab);
        }
    });

    obviel.view({
        iface: 'view',
        render: function() {
            window.open(this.data.url);
        }
    });

    obviel.view({
        iface: 'content',
        render: function() {
            this.smi.notifications.mark_as_seen();
            this.smi._.workspace.trigger('content-smi', this.data);
            this.smi._.navigation.trigger('content-smi', this.data);
            if (this.data.notifications) {
                this.smi.notifications.notifies(this.data.notifications);
            }
        }
    });

    /**
     * A ShortcutManager let you bind, unbind, rebind collection of
     * shortcuts.
     */
    var ShortcutManager = function() {
        this._shortcuts = {};
        this._zones = {};
        this._order = [];
        this._selected = 0;

        var make_unselect = function(direction) {
            return function() {
                if (this._order.length) {
                    var previous_zone = this.get_current_zone();
                    previous_zone.removeClass('focus');
                    previous_zone.trigger('blur-smi');
                    this._selected = (this._selected + direction) % this._order.length;
                    if (this._selected < 0) {
                        this._selected = this._order.length - 1;
                    };
                    var zone = this.get_current_zone();
                    zone.addClass('focus');
                    zone.trigger('focus-smi');
                    zone.addClass('highlight');
                    setTimeout(function() {zone.removeClass('highlight');}, 500);
                };
            }.scope(this);
        }.scope(this);
        shortcut.add('ctrl+shift+left', make_unselect(-1));
        shortcut.add('ctrl+shift+right', make_unselect(1));
    };

    ShortcutManager.prototype.get_current = function () {
        if (this._order.length) {
            return this._order[this._selected];
        };
        return null;
    };
    ShortcutManager.prototype.get_current_zone = function() {
        var current = this.get_current();

        if (current) {
            return this._zones[current];
        };
        return null;
    };

    ShortcutManager.prototype.new_shortcuts = function(name, zone) {
        if (this._zones[name] === undefined) {
            this._zones[name] = zone;
            this._order.push(name);
            this._shortcuts = [];
        };
    };

    ShortcutManager.prototype.remove_shortcuts = function(name) {
        if (this._zones[name] !== undefined) {
            if (this.get_current() == name) {
                this._selected = 0;
            }
            this._order.splice(this._order.indexOf(name), 1);
            delete this._zones[name];
            delete this._shortcuts[name];
        };
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
        notification.bind('close-sminotification', function() {
            // Disable timeout if dialog is closed
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            };
            notification.animate({ height:0, opacity:0 }, 'slow', function() {
                notification.remove();
                if (!container.children().length) {
                    container.hide();
                }
            });
        });

        // Close and autoclose
        notification.bind('click', function() {
            notification.trigger('close-sminotification');
        });
        if(typeof message.autoclose == 'number') {
            timer = setTimeout(function() {
                notification.trigger('close-sminotification');
            }, message.autoclose);
        };

        container.append(notification);
        if (!container.is(':visible')) {
            container.show();
        };
    };

    /**
     * NotificationManager manage notifications
     * @param options: configuration options.
     */
    var NotificationManager = function(options) {
        this.$container = $(options.selector);

        // Listen to pull notification events.
        $(document).bind('refresh-feedback-smi', function() {
            $.getJSON(options.url, function(messages) {
                this.notifies(messages);
            }.scope(this));
        }.scope(this));

        $(document).bind('notify', function(event, message) {
            this.notify(message);
        }.scope(this));
    };

    /**
     * Notify of a new notification
     * @param message: message.
     */
    NotificationManager.prototype.notify = function(message) {
        new Notification(this.$container, message);
    };

    /**
     * Notify a list of new notifications
     * @param messages: list of messages.
     */
    NotificationManager.prototype.notifies = function(messages) {
        $.each(messages, function(i, message) {
            this.notify(message);
        }.scope(this));
    };

    /**
     * Mark all notifications as seen.
     */
    NotificationManager.prototype.mark_as_seen = function() {
        this.$container.children().trigger('close-sminotification');
    };

    /**
     * Clipboard used for listing content.
     * @param notification: notification manage used to send notifications.
     */
    var ClipBoard = function(notifications) {
        this.ifaces = ['clipboard'];
        this.notifications = notifications;
        // content represent information about content that might be
        // the target of a paste.
        this.content = null;
        this._clear();
    };

    // Internal clear.
    ClipBoard.prototype._clear = function() {
        this.cutted = [];
        this._cutted_ids = [];
        this.copied = [];
        this._copied_ids = [];
    };

    /**
     * Clear the clipboard.
     */
    ClipBoard.prototype.clear = function(no_notification) {
        this._clear();
        $('body').trigger('contentchange-smiclipboard');
        if (!no_notification) {
            this.notifications.notify({
                message: 'Clipboard cleared.',
                autoclose: 4000});
        };
    };

    /**
     * Store the given items as a cut in the clipboard.
     * @param items: Cutted items.
     */
    ClipBoard.prototype.cut = function(items, no_notification) {
        var count = 0;

        $.each(items, function(i, item) {
            if (this._cutted_ids.indexOf(item.id) < 0) {
                this._cutted_ids.push(item.id);
                this.cutted.push(item);
                count += 1;
            };
        }.scope(this));
        $('body').trigger('contentchange-smiclipboard');
        if (!no_notification) {
            this.notifications.notify({
                message: 'Cutted ' + count.toString() + ' content(s) in the clipboard.',
                autoclose: 4000});
        };
    };

    /**
     * Store the given items as a copy in the clipboard.
     * @param items: Copied items.
     */
    ClipBoard.prototype.copy = function(items, no_notification) {
        var count = 0;

        $.each(items, function(i, item) {
            if (this._copied_ids.indexOf(item.id) < 0) {
                this._copied_ids.push(item.id);
                this.copied.push(item);
                count += 1;
            };
        }.scope(this));
        $('body').trigger('contentchange-smiclipboard');
        if (!no_notification) {
            this.notifications.notify({
                message: 'Copied ' + count.toString() + ' content(s) in the clipboard.',
                autoclose: 4000});
        };
    };

    /**
     * Return the size of the clipboard.
     */
    ClipBoard.prototype.length = function() {
        return this.cutted.length + this.copied.length;
    };

    /**
     * SMI object.
     */
    var SMI = function(options) {
        var navigation = $(options.navigation.selector);
        var workspace = $(options.workspace.selector);

        this._ = {};
        this._.screen_url = jsontemplate.Template(options.screen, {});
        this._.action_url = jsontemplate.Template(options.action, {});
        this._.workspace = workspace;
        this._.navigation = navigation;

        this.opened = {path: '', screen: ''}; // Currently opened screen
        this.opening = {path: '', screen: ''}; // Screen being currently opened
        this.options = options;
        this.shortcuts = new ShortcutManager();
        this.shortcuts.new_shortcuts('navigation', navigation);
        this.notifications = new NotificationManager(options.notifications);
        this.clipboard = new ClipBoard(this.notifications);

        navigation.SMINavigation(this, options.navigation);
        workspace.SMIWorkspace(this, options.workspace);

        // By default, navigation is blue and workspace is focus
        navigation.trigger('blur-smi');
        workspace.trigger('focus-smi');

        var process_hash = function(hash) {
            var parts = HASH_REGEXP.exec(hash);

            if (parts) {
                this.opening = {screen: parts[1], path: parts[2]};
            } else {
                this.opening = {screen: '', path: ''};
            };

            if (!this.opening.screen.length) {
                this.opening.screen = 'content';
            };
            this.send_to_screen();
        }.scope(this);

        // Bind the hash change used by open
        $(window).hashchange(function(event, data) {
            process_hash(data.after);
        });

        // Bind event to open new tab
        {
            var open_link = this.open_screen_from_link.scope(this);
            $(document).delegate('a.open-screen', 'click', function(event) {
                open_link($(this));
                return false;
            });
        };
        // Bind action to open
        {
            var open_action = this.open_action_from_link.scope(this);
            $(document).delegate('a.open-action', 'click', function(event) {
                open_action($(this));
                return false;
            });
        };

        // Plugins initialization
        $(document).trigger('load-smiplugins', this);

        // Open the current location.
        process_hash(document.location.hash);
    };

    /**
     * Open a content tab for the content located on the given
     * path. If tab is not provided, open the content tab.
     *
     * @param path: path to the content to open.
     * @param tab: tab name to open on the content.
     */
    SMI.prototype.open_screen = function(path, screen) {
        if (screen == undefined) {
            screen = this.opened.screen;
        };
        document.location.hash = screen + '!' + path;
    };

    /**
     * Open a content tab by reading the given link information.
     * @param link: link containing information to open the content tab.
     */
    SMI.prototype.open_screen_from_link = function(link) {
        var path = link.attr('href');

        if (!path) {
            path = this.opened.path;
        };
        this.open_screen(path, link.attr('rel'));
    };

    /**
     * Return a given screen URL.
     */
    SMI.prototype.get_screen_url = function(screen) {
        if (!screen) {
            screen = this.opened;
        };
        return this._.screen_url.expand(screen);
    };

    /**
     * Send data to the server corresponding to the currently opened
     * tab.
     * @param data: dictionnary to be posted to the server.
     */
    SMI.prototype.send_to_screen = function(data) {
        var query = {};

        query['url'] = this.get_screen_url(this.opening);
        query['dataType'] = 'json';
        query['success'] = function(data) {
            this.opened = this.opening;
            $(document).render({data: data, extra: {smi: this}});
        }.scope(this);
        query['error'] = function(request, status, error) {
            alert('Error '  + request.status.toString() + ' please reboot: ' + error);
        };
        if (data) {
            query['type'] = 'POST';
            query['data'] = data;
        };
        $.ajax(query);
    };

    /**
     * Send an action, and process the result.
     */
    SMI.prototype.open_action_from_link = function(link) {
        var query = {};
        var action = link.attr('rel');
        var path = link.attr('href');

        if (!path) {
            path = this.opened.path;
        };
        query['url'] = this._.action_url.expand({path: path, action: action});
        query['dataType'] = 'json';
        query['success'] = function(data) {
            $(document).render({data: data, extra: {smi: this}});
        }.scope(this);
        query['error'] = function(request, status, error) {
            alert('Error '  + request.status.toString() + ' please reboot: ' + error);
        };
        $.ajax(query);
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

    /**
     * JQuery SMI loader
     */
    $.fn.SMI = function(options) {
        return new SMI(options);
    };

})(jQuery, obviel, shortcut);


