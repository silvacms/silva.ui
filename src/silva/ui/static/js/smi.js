
(function($, infrae, jsontemplate) {
    var HASH_REGEXP = /#([^!]*)!?(.*)/;

    /**
     * Screen location, i.e. content path and opened screen. This
     * permit you define the default screen location, test if you are
     * already at given a location or open a location.
     */
    var Screen = function(default_screen) {
        var api = {
            ifaces: ['redirect'],
            path: '',
            screen: '',
            default_screen: function() {
                var current_default = Screen(default_screen);

                current_default.path = api.path;
                current_default.screen = default_screen;
                return current_default;
            },
            is_default_screen: function() {
                return api.screen === default_screen;
            },
            copy: function(other) {
                api.path = other.path;
                api.screen = other.screen;
            },
            equal: function(other) {
                return api.path == other.path && api.screen == other.screen;
            },
            open: function(new_path, new_screen) {
                if (!new_path)
                    new_path = api.path;
                if (!new_screen)
                    new_screen = api.screen;
                document.location.hash = new_screen + '!' + new_path;
            },
            read: function(hash) {
                var parts = HASH_REGEXP.exec(hash);

                if (parts) {
                    api.screen = parts[1];
                    api.path = parts[2];
                } else {
                    api.screen = '';
                    api.path = '';
                };

                if (!api.screen.length) {
                    api.screen = default_screen;
                };
            }
        };
        return api;
    };

    /**
     * SMI object.
     */
    $.fn.SMI = function(options) {
        var smi = {
            objection: null,// Objection when to open a screen or execute an action
            ready: infrae.deferred.SemaphoreCallbacks(),// Flag indicating if something is loading
            options: options,
            opened: Screen('content'), // Currently opened screen
            opening: Screen('content'),// Screen being currently opened
            shortcuts: infrae.keyboard.ShortcutManager(document)
        };

        var $workspace = $(options.workspace.selector);
        var $workspace_header = $workspace.children('.header');
        var $workspace_content = $workspace.children('.content');

        infrae.ui.selection.disable($workspace_header.children('.metadata'));
        if (options.theme && options.theme.background) {
            $('html').css('background-color', options.theme.background);
        };

        var screen_url = new jsontemplate.Template(options.screen, {}),
            action_url = new jsontemplate.Template(options.action, {}),
            content_url = new jsontemplate.Template(options.workspace.url, {});

        var name;
        var plugins = {};
        var resources = infrae.views.HTMLResourceManager($(document));
        var default_error_handlers = {};

        for (name in infrae.smi.plugins) {
            plugins[name] = infrae.smi.plugins[name](smi, options);
        };

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
                            if (data.metadata !== undefined) {
                                $workspace_header.render({
                                    data: data.metadata,
                                    name: 'header',
                                    args: [smi, content_url, this]
                                });
                            };
                        });
                    }
                };
            }
        });

        // Add utilities and screen open functions
        $.extend(smi, {
            clipboard: infrae.smi.ClipBoardManager(plugins.notifications),
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
             *
             * @param screen: optional screen to compute the URL.
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
                query: function(url, data, error_handlers) {
                    var query = {};

                    query['url'] = url;
                    query['dataType'] = 'json';
                    if (data) {
                        query['type'] = 'POST';
                        query['data'] = data;
                    };
                    return $.ajax(query).then(
                        function (payload) {
                            var delayed = $.Deferred().resolve(),
                                result = $.Deferred(),
                                name;

                            // Default success handler.
                            if (payload.resources != undefined) {
                                // Resources. If there are Javascript, we delay the execution of
                                // the callback up until the javascript are loaded.
                                if (payload.resources.js) {
                                    delayed = delayed.then(function() {
                                        return resources.load_js(payload.resources.js);
                                    });
                                };
                                if (payload.resources.css) {
                                    delayed = delayed.then(function() {
                                        return resources.load_css(payload.resources.css);
                                    });
                                };
                            };
                            for (name in plugins) {
                                if (plugins[name].page !== undefined) {
                                    plugins[name].page(payload);
                                };
                            };
                            delayed.done(function () {
                                result.resolve(payload.content);
                            });
                            // Return content attribute if any. Next handler will work on it.
                            return result;
                        },
                        function (request) {
                            if (!smi.options.testing) {
                                // During testing disable error handlers.
                                if (error_handlers === undefined) {
                                    // If not specified, fallback on the default error handlers.
                                    error_handlers = default_error_handlers;
                                }
                                // Fetch the error handler and execute it
                                var handler = error_handlers[request.status];
                                if (handler === undefined) {
                                    handler = error_handlers[500];
                                };
                                var result_handler = handler(request);
                                // No result, direct fail. Promise, return it, otherwise render it.
                                if (result_handler) {
                                    if (result_handler.promise !== undefined) {
                                        return result_handler;
                                    };
                                    return $(document).render(
                                        {data: result_handler, args: [smi], reject: [request]});
                                };
                            };
                            return $.Deferred().reject(request);
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
                    return deferred.then(
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
                    return callback().then(
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
                 * Create a set of error handlers to use with query,
                 * with the default error handlers as default.
                 */
                create_error_handlers: function(custom_handlers, parent_handlers) {
                    var handlers = {};
                    var default_handler;
                    var code;

                    if (parent_handlers === undefined) {
                        parent_handlers = default_error_handlers;
                    };
                    for (code in parent_handlers) {
                        handlers[code] = parent_handlers[code];
                    };
                    for (code in custom_handlers) {
                        default_handler = parent_handlers[code];
                        if (default_handler === undefined) {
                            default_handler = parent_handlers[500];
                        };
                        handlers[code] = custom_handlers[code](default_handler);
                    };
                    return handlers;
                },
                /**
                 * Send data to the server corresponding to the currently opened
                 * tab.
                 * @param data: dictionnary to be posted to the server.
                 */
                send_to_opened: function(data, error_handlers) {
                    return smi.ajax.lock(function () {
                        return smi.ajax.vote(function () {
                            return smi.ajax.query(
                                smi.get_screen_url(smi.opening),
                                data,
                                error_handlers).then(
                                    function (payload) {
                                        smi.opened.copy(smi.opening);
                                        return $(document).render({data: payload, args: [smi]});
                                    });
                        }).then(
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
                            {path: smi.opened.path, screen: smi.opened.screen}).then(
                                function (payload) {
                                    return $(document).render({data: payload, args: [smi]});
                                });
                    });
                });
            }
        });
        // Initialize default_error_handlers
        default_error_handlers = (function() {
            var ajax_handler = function(default_handler) {
                return function (request) {
                    try {
                        var payload = $.parseJSON(request.responseText),
                            name;

                        for (name in plugins) {
                            if (plugins[name].error !== undefined) {
                                plugins[name].error(payload);
                            };
                        };
                        return payload.content;
                    } catch (e) {
                        return default_handler(request);
                    };
                };
            };

            return smi.ajax.create_error_handlers({
                400: ajax_handler,
                401: ajax_handler
            }, options.error_messages);
        })();

        $(document).delegate('a.open-action', 'click', function(event) {
            smi.open_action_from_link($(this));
            return false;
        });
        $(document).delegate('a.text-overlay', 'click', function(event) {
            smi.ajax.query($(this).attr('href')).then(function(payload) {
                return $(document).render({data: payload, args: [smi]});
            });
            return false;
        });

        // Plugins initialization
        $(document).trigger('load-smiplugins', smi);

        // Bind the hash change used by open (effectively enable open).
        var read_hash = function(hash) {
            // Create the error handlers for opening new screens when hash change
            var error_handlers = smi.ajax.create_error_handlers({
                404: function(default_handler) {
                    return function(request) {
                        if (!smi.opening.is_default_screen()) {
                            // On a 404, by default we redirect to the default screen (success)
                            return $.Deferred().resolve(smi.opening.default_screen());
                        };
                        return default_handler(request);
                    };
                }
            });

            // Redefine read_hash just to open now
            read_hash = function(hash) {
                smi.opening.read(hash);
                if (!smi.opening.equal(smi.opened))
                    smi.ajax.send_to_opened(undefined, error_handlers);
            };
            return read_hash(hash);
        };
        $(window).hashchange(function(event, data) {
            read_hash(data.after);
        });

        // Open the current location.
        read_hash(document.location.hash);

        return smi;
    };

    infrae.smi = {
        plugins: {}
    };

})(jQuery, infrae, jsontemplate);
