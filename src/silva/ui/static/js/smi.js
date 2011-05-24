

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


(function($, infrae) {
    var HASH_REGEXP = /#([^!]*)!?(.*)/;


    /**
     * NotificationManager manage notifications
     * @param options: configuration options.
     */
    var NotificationManager = function(options) {
        var $container = $(options.selector);
        var manager = {
            /**
             * Notify of a new notification
             * @param message: message.
             */
            notify: function(message) {
                var $notification = $('<div class="notification"></div>');
                var timer = null;

                if (typeof(message.title) == 'string') {
                    $notification.prepend('<h3>' + message.title + '</h3>');
                };
                if (typeof(message.category) == 'string') {
                    $notification.addClass(message.category);
                    switch (message.category) {
                    case 'error':
                        $notification.append('<ins class="ui-icon ui-icon-alert" />');
                        break;
                    };
                };
                if (typeof(message.message) == 'string') {
                    $notification.append('<p>' + message.message + '</p>');
                };

                // Bind the close event
                $notification.bind('close-sminotification', function() {
                    // Disable timeout if dialog is closed
                    if (timer !== null) {
                        clearTimeout(timer);
                        timer = null;
                    };
                    $notification.animate({ height:0, opacity:0 }, 'slow', function() {
                        $notification.remove();
                        if (!$container.children().length) {
                            $container.hide();
                        };
                    });
                });

                // Close and autoclose
                $notification.bind('click', function() {
                    $notification.trigger('close-sminotification');
                });
                if (typeof message.autoclose == 'number') {
                    timer = setTimeout(function() {
                        $notification.trigger('close-sminotification');
                    }, message.autoclose);
                };

                $container.append($notification);
                if (!$container.is(':visible')) {
                    $container.show();
                };

            },
            /**
             * Notify a list of new notifications
             * @param messages: list of messages.
             */
            notifies: function(messages) {
                infrae.utils.each(messages, manager.notify);
            },
            /**
             * Mark all notifications as seen.
             */
            mark_as_seen : function() {
                $container.children().trigger('close-sminotification');
            }
        };

        // Listen to pull notification events.
        $(document).bind('refresh-feedback-smi', function() {
            $.getJSON(options.url, function(messages) {
                if (messages) {
                    manager.notifies(messages);
                };
            });
        });
        // Display a notification
        $(document).bind('notify-feedback-smi', function(event, data) {
            manager.mark_as_seen(); // Clear old notification first.
            if (typeof(data) == "array") {
                manager.notifies(data);
            } else {
                manager.notify(data);
            };
        });
        return manager;
    };

    /**
     * Clipboard used for listing content.
     * @param notification: notification manage used to send notifications.
     */
    var ClipBoard = function(notifications) {
        this.notifications = notifications;
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

        this._clear();
        $.each(items, function(i, item) {
            if ($.inArray(item.id, this._cutted_ids) < 0) {
                this._cutted_ids.push(item.id);
                this.cutted.push(item);
                count += 1;
            };
        }.scope(this));
        $('body').trigger('contentchange-smiclipboard');
        if (!no_notification) {
            var message = {
                message: 'Cutted ' + count.toString() + ' content(s) in the clipboard.',
                autoclose: 4000};
            if (!count) {
                message['category'] = 'error';
            };
            this.notifications.notify(message);
        };
    };

    /**
     * Store the given items as a copy in the clipboard.
     * @param items: Copied items.
     */
    ClipBoard.prototype.copy = function(items, no_notification) {
        var count = 0;

        this._clear();
        $.each(items, function(i, item) {
            if ($.inArray(item.id, this._copied_ids) < 0) {
                this._copied_ids.push(item.id);
                this.copied.push(item);
                count += 1;
            };
        }.scope(this));
        $('body').trigger('contentchange-smiclipboard');
        if (!no_notification) {
            var message = {
                message: 'Copied ' + count.toString() + ' content(s) in the clipboard.',
                autoclose: 4000};
            if (!count) {
                message['category'] = 'error';
            };
            this.notifications.notify(message);
        };
    };

    /**
     * Return the size of the clipboard.
     */
    ClipBoard.prototype.length = function() {
        return this.cutted.length + this.copied.length;
    };


    var Screen = function(default_screen) {
        var screen = {path: '', screen: ''};

        $.extend(screen, {
            copy: function(other) {
                screen.path = other.path;
                screen.screen = other.screen;
            },
            equal: function(other) {
                return screen.path == other.path && screen.screen == other.screen;
            },
            open: function(new_path, new_screen) {
                if (!new_path)
                    new_path = screen.path;
                if (!new_screen)
                    new_screen = screen.screen;
                document.location.hash = new_screen + '!' + new_path;
            },
            read: function(hash) {
                var parts = HASH_REGEXP.exec(hash);

                if (parts) {
                    screen.screen = parts[1];
                    screen.path = parts[2];
                } else {
                    screen.screen = '';
                    screen.path = '';
                };

                if (!screen.screen.length) {
                    screen.screen = default_screen;
                };
            }
        });
        return screen;
    };

    /**
     * SMI object.
     */
    $.fn.SMI = function(options) {
        var smi = {
            objection: null,// Objection when to open a screen or execute an action
            ready: infrae.deferred.StackCallbacks(),// Flag indicating if something is loading
            options: options,
            opened: Screen('content'), // Currently opened screen
            opening: Screen('content') // Screen being currently opened
        };

        var $workspace = $(options.workspace.selector);
        var $workspace_header = $workspace.children('.header');
        var $workspace_content = $workspace.children('.content');

        infrae.ui.selection.disable($workspace_header.children('.metadata'));
        if (options.theme && options.theme.background) {
            $('html').css('background-color', options.theme.background);
        };

        var screen_url = new jsontemplate.Template(options.screen, {});
        var action_url = new jsontemplate.Template(options.action, {});
        var content_url = new jsontemplate.Template(options.workspace.url, {});

        var navigation = $(options.navigation.selector).SMINavigation(smi, options.navigation);
        var notifications = NotificationManager(options.notifications);
        var resources = infrae.views.HTMLResourceManager();
        smi.clipboard = new ClipBoard(notifications);

        // Register the default content view.
        infrae.views.view({
            iface: 'screen',
            factory: function($content, data, smi) {
                return {
                    render: function() {
                        // Update content area
                        $workspace_content.render({
                            data: data.screen,
                            name: 'content',
                            args: [smi]
                        }).done(function() {
                            $workspace_header.render({
                                data: data.metadata,
                                name: 'header',
                                args: [smi, content_url, this]});
                        });
                    }
                };
            }
        });

        // Add utilities and screen open functions
        $.extend(smi, {
            /**
             * Retrieve the language used by the SMI.
             */
            get_language: function() {
                var lang = $('html').attr('lang');

                if (!lang) {
                    lang = 'en';
                };
                return lang;
            },
            /**
             * Return a given screen URL.
             */
            get_screen_url: function(screen) {
                if (!screen) {
                    screen = smi.opened;
                };
                return screen_url.expand(screen);
            },
            /**
             * Open a content tab for the content located on the given
             * path. If tab is not provided, open the content tab.
             *
             * @param path: path to the content to open.
             * @param tab: tab name to open on the content.
             */
            open_screen: function(path, screen) {
                smi.opened.open(path, screen);
            },
            /**
             * Open a content tab by reading the given link information.
             * @param link: link containing information to open the content tab.
             */
            open_screen_from_link: function(link) {
                var path = link.attr('href');

                if (!path || path == "#") {
                    path = smi.opened.path;
                };
                smi.open_screen(path, link.attr('rel'));
            }
        });
        $(document).delegate('a.open-screen', 'click', function(event) {
            smi.open_screen_from_link($(this));
            return false;
        });

        // Add AJAX feature queries.
        $.extend(smi, {
            ajax: {
                /**
                 * Send a query to the given URL, POST data as JSON if given.
                 */
                query: function(url, data) {
                    var query = {};

                    query['url'] = url;
                    query['dataType'] = 'json';
                    if (data) {
                        query['type'] = 'POST';
                        query['data'] = data;
                    };
                    return $.ajax(query).pipe(
                        function (payload) {
                            // Default success handler.
                            if (payload.resources != undefined) {
                                // Resources
                                if (payload.resources.js) {
                                    infrae.utils.each(payload.resources.js, resources.load_js);
                                };
                                if (payload.resources.css) {
                                    infrae.utils.each(payload.resources.css, resources.load_css);
                                };
                            };
                            if (payload.navigation != undefined) {
                                // Manage navigation.
                                if (payload.navigation.invalidation != undefined)
                                    navigation.invalidate(payload.navigation.invalidation);
                                if (payload.navigation.current != undefined)
                                    navigation.open(payload.navigation.current);
                            };
                            notifications.mark_as_seen(); // Always clean old status
                            if (payload.notifications != undefined) {
                                // Display any notification.
                                notifications.notifies(payload.notifications);
                            };
                            // Return content attribute if any. Next handler will work on it.
                            return payload.content;
                        },
                        function (request) {
                            // Default error handler.
                            var message = options.errors[request.status];
                            if (!message) {
                                message = options.errors[500];
                            };
                            return $(document).render({data: message, args: [smi], reject: [request]});
                        });
                },
                /**
                 * Vote for an action (or not). Execute the objections
                 * callbacks. If they doesn't reject the deferred, the
                 * objections callbacks are cleared, and the callback
                 * is executed.
                 */
                vote: function(callback) {
                    // No objection, do nothing.
                    if (!smi.objection)
                        return callback();

                    var deferred = smi.objection();
                    if (!deferred) {
                        deferred =  $.Deferred();
                        deferred.resolve();
                    };
                    deferred.done(function () {
                        smi.objection = null;
                    });
                    return deferred.pipe(
                        callback,
                        function() {
                            // request.status == 417 means Expectation failed.
                            return $.Deferred(function(deferred) {
                                deferred.reject({status: 417});
                            });
                        });
                },
                /**
                 * Run the callback inside of the SMI delay system.
                 */
                lock: function(callback) {
                    smi.ready.use();
                    return callback().pipe(
                        function () {
                            smi.ready.release(200);
                            return {};
                        },
                        function (request) {
                            smi.ready.release(request.status);
                            return {};
                        });
                },
                /**
                 * Send data to the server corresponding to the currently opened
                 * tab.
                 * @param data: dictionnary to be posted to the server.
                 */
                send_to_opened: function(data) {
                    return smi.ajax.lock(function () {
                        return smi.ajax.vote(function () {
                            return smi.ajax.query(
                                smi.get_screen_url(smi.opening),
                                data).pipe(
                                    function (payload) {
                                        smi.opened.copy(smi.opening);
                                        return $(document).render({data: payload, args: [smi]});
                                    });
                        }).pipe(
                            null,
                            function (request) {
                                // In case of error, revert the screen if needed.
                                if (!smi.opening.equal(smi.opened)){
                                    smi.opening.copy(smi.opened);
                                    smi.opening.open();
                                };
                                return request;
                            });
                    });
                }
            },
            /**
             * Send an action, and process the result.
             */
            open_action_from_link: function(link) {
                return smi.ajax.lock(function() {
                    return smi.ajax.vote(function() {
                        var action = link.attr('rel');
                        var path = link.attr('href');

                        if (!path) {
                            path = smi.opened.path;
                        };
                        return smi.ajax.query(
                            action_url.expand({path: path, action: action}),
                            {path: smi.opened.path, screen: smi.opened.screen}).pipe(
                                function (payload) {
                                    return $(document).render({data: payload, args: [smi]});
                                });
                    });
                });
            }
        });
        $(document).delegate('a.open-action', 'click', function(event) {
            smi.open_action_from_link($(this));
            return false;
        });

        // Plugins initialization
        $(document).trigger('load-smiplugins', smi);

        // Bind the hash change used by open (effectively enable open).
        var read_hash = function(hash) {
            smi.opening.read(hash);
            if (!smi.opening.equal(smi.opened))
                smi.ajax.send_to_opened();
        };
        $(window).hashchange(function(event, data) {
            read_hash(data.after);
        });

        // Open the current location.
        read_hash(document.location.hash);

        return smi;
    };

})(jQuery, infrae);


