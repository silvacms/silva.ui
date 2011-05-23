
(function (infrae, $) {
    var module = {
        /**
         * HTMLResourceManager, load extra JS or CSS at run time.
         */
        HTMLResourceManager: function() {
            var data = {
                css: [],
                js: []
            };
            var resources = {
                /**
                 * Return true if the given Javascript is already loaded.
                 * @param script: url of the Javascript file.
                 */
                is_js_loaded: function(script) {
                    return $.inArray(script, data.js) > -1;
                },
                /**
                 * Return true if the given CSS is already loaded.
                 * @param css: url of the CSS file.
                 */
                is_css_loaded: function(css) {
                    return $.inArray(css, data.css) > -1;
                },
                /**
                 * Load a given JS file.
                 * @param script: url of the JS file.
                 */
                load_js: function(script) {
                    if (!resources.is_js_loaded(script)) {
                        // We don't use jQuery here, as does strange things with scripts.
                        var head = document.getElementsByTagName('head')[0];
                        var script_tag = document.createElement('script');

                        script_tag.type = 'text/javascript';
                        script_tag.src = script;
                        head.appendChild(script_tag);

                        data.js.push(script);
                    };
                },
                /**
                 * Load a given CSS file.
                 * @param css: url of the CSS file.
                 */
                load_css: function(css) {
                    if (!resources.is_css_loaded(css)) {
                        // We don't use jQuery here, as does strange things with links.
                        var head = document.getElementsByTagName('head')[0];
                        var link_tag = document.createElement('link');

                        link_tag.rel = 'stylesheet';
                        link_tag.type = 'text/css';
                        link_tag.href = css;
                        head.appendChild(link_tag);

                        data.css.push(css);
                    };
                }
            };

            $(document).ready(function() {
                $('script').each(function () {
                    var src = $(this).attr('src');

                    if (src != undefined && ! resources.is_js_loaded(src)) {
                        data.js.push(src);
                    };
                });
                $('link').each(function () {
                    var $link = $(this);

                    if ($link.attr('rel') == 'stylesheet' && $link.attr('type') == 'text/css') {
                        var src = $link.attr('href');
                        if (src != undefined && !resources.is_css_loaded(src)) {
                            data.css.push(src);
                        };
                    };
                });
            });
            return resources;
        }
    };

    // Template cache: mapping url or html to template instance or html
    var template_cache = {};

    /**
     * View
     * @param definition: definition of the view (object containing settings and methods)
     * @param element: DOM element on which the view will be rendered
     * @param data: data object used by the view to be rendered.
     */
    var View = function($content, data, factory, args, reject) {
        var view = {
            $content: $content,
            data: data
        };

        $.extend(view, factory.apply($content, args));

        // finish to render the view using the given template
        var render = function(template) {
            // Clean content if needed (call cleanup callback)
            $content.triggerHandler('cleanup-infrae-views');

            if (view.cleanup) {
                // Install new cleanup callback
                $content.one('cleanup-infrae-views', function() {
                    view.cleanup();
                });
            };

            // Make a finalizer that call render and finish.
            var deferred = $.Deferred();
            var finalizer = function() {
                if (view.render != undefined)
                    view.render();
                if (reject != undefined)
                    deferred.rejectWith(view, reject);
                else
                    deferred.resolveWith(view);
            };

            // Insert content and call render.
            if (view.iframe) {
                var $iframe = $('<iframe src="">');

                $iframe.height($content.height());
                $iframe.width($content.width());
                $content.html($iframe);
                if (template) {
                    if (template.indexOf('<html') < 0 &&
                        template.indexOf('<HTML') < 0) {
                        // no html tags, add missing html tag
                        template = '<html><body>' + template + '</body></html>';
                    };
                    var template_window = $iframe.get(0).contentWindow;
                    var template_document = template_window.document;
                    $(template_document).ready(finalizer);
                    template_document.write(template);
                    template_document.close();
                } else {
                    finalizer();
                };
            } else {
                if (template) {
                    $content.html(template);
                };
                finalizer();
            };
            return deferred.promise();
        };

        // render the view: retrieve a template to render it and render it
        return function() {
            // Remote JSON
            var jsont_url = view.data_template && data.jsont_url || view.jsont_url;
            if (jsont_url) {
                // First look in the cache for data.
                if (!view.nocache) {
                    var template = template_cache[jsont_url];
                    if (template) {
                        return render(template.expand(view));
                    };
                };
                return $.ajax({
                    type: 'GET',
                    url: jsont_url
                }).pipe(function (payload) {
                    var template = new jsontemplate.Template(payload, {});
                    template_cache[jsont_url] = template;
                    return render(template.expand(data));
                });
            };

            // Remote HTML
            var html_url = view.data_template && data.html_url || view.html_url;
            if (html_url) {
                // First look in the cache for data.
                if (!view.nocache) {
                    var template = template_cache[html_url];
                    if (template) {
                        return render(template);
                    };
                };
                return $.ajax({
                    type: 'GET',
                    url: html_url
                }).pipe(function (payload) {
                    template_cache[html_url] = payload;
                    return render(payload);
                });
            };

            // Local JSON
            var jsont = view.data_template && data.jsont || view.jsont;
            if (jsont) {
                var template = template_cache[jsont];

                if (!template) {
                    template = new jsontemplate.Template(jsont, {});
                    template_cache[jsont] = template;
                };
                return render(template.expand(view));
            };

            // Local HTML
            var html = view.data_template && data.html || view.html;
            if (html) {
                return render(html);
            };

            // No explicit content, just call render.
            return render();
        };
    };

    $.extend(module, {
        /**
         * Registery to used register views and render them.
         */
        Registry: function() {
            // Registered views
            var views = {}; // name to dict {name: iface: view}
            var count = 0;

            // Render the most specialized view for a JSON object
            var render_best_view = function($content, data, options) {
                var ifaces = options.ifaces || infrae.interfaces.implementedBy(data);
                var named_views = views[options.name];
                var to_render = null;

                var args = [$content, data].concat(options.args);
                var reject = options.reject;

                if (named_views) {
                    for (var i=0; i < ifaces.length; i++) {
                        var definitions = named_views[ifaces[i]];
                        if (definitions && definitions.length) {
                            to_render = View($content, data, definitions[0].factory, args, reject);
                            break;
                        };
                    };
                };
                if (to_render != null) {
                    return to_render();
                };
                if (window.console && console.log) {
                    console.log('failed view lookup for options', options, 'and', data);
                };
                return null;
            };

            // Render all possible views for a given JSON object (viewlet like)
            var render_all_views = function($content, data, options) {
                var named_views = views[options.name];

                if (named_views == undefined) {
                    return [];
                };

                var ifaces = options.ifaces || infrae.interfaces.implementedBy(data);
                var seen_definitions = [];
                var to_render = [];

                var args = [$content, data].concat(options.args);
                var reject = options.reject;

                infrae.utils.each(ifaces, function (iface) {
                    var definitions = named_views[iface];
                    if (definitions) {
                        infrae.utils.each(definitions, function(definition) {
                            if ($.inArray(definition['__view_uid__'], seen_definitions) < 0) {
                                seen_definitions.push(definition['__view_uid__']);
                                if (definition['available'] != undefined) {
                                    if (!definition['available'].apply(definition, args)) {
                                        return;
                                    };
                                };
                                to_render.push([
                                    definition.order,
                                    View($content, data, definition.factory, args, reject)]);
                            };
                        });
                    };
                });
                to_render.sort(function (v1, v2) {
                    return v1[0] - v2[0];
                });
                $.each(to_render, function (i, data) {
                    data[1]();
                });
                return null;
            };

            // Fetch an JSON object and render it.
            var render_url = function($content, url, options) {
                return $.ajax({
                    type: 'GET',
                    url: url,
                    dataType: 'json'
                }).pipe(function(data) {
                    return render_best_view($content, data, options);
                });
            };

            var registry = {
                /**
                 * Register a new view by its name, defaulting to 'default'
                 * and its iface, defaulting to 'object'.
                 * @param definition: definition of the view.
                 */
                register: function(definition) {
                    // Default values.
                    if (definition.name == undefined) {
                        definition.name = 'default';
                    };
                    if (definition.order == undefined) {
                        definition.order = 0;
                    };

                    definition['__view_uid__'] = count.toString();
                    count += 1;

                    var add = function(definition, iface) {
                        if (!views[definition.name]) {
                            views[definition.name] = {};
                        };
                        if (!views[definition.name][iface]) {
                            views[definition.name][iface] = [];
                        };
                        views[definition.name][iface].unshift(definition);
                    };

                    // Registration multiple or simple
                    if (definition.ifaces) {
                        infrae.utils.each(definition.ifaces, function(iface) {
                            add(definition, iface);
                        });
                    } else {
                        // Default
                        add(definition, definition.iface || 'object');
                    };
                },
                /**
                 * Render a View.
                 * @param $content: jQuery content on which the view is rendered.
                 *
                 * Arguments are provided as an object:
                 * @param data: object used to render using the view.
                 * @param every: alternative object to render all available view.
                 * @param name: name of the view to render, optional, defaults to
                 *          'default'.
                 * @param callback: optional, a function that is called after the
                 *          rendering has completed, with args 'element' (the
                 *          JQuery-wrapped element that the view is executed on),
                 *          'view' (the view instance) and 'context' (a reference
                 *          to 'obj').
                 */
                render: function($content, options) {
                    if (!options.name) {
                        options.name = 'default';
                    };

                    if (options.data) {
                        return render_best_view($content, options.data, options);
                    } else if (options.every) {
                        return render_all_views($content, options.every, options);
                    } else if(options.url) {
                        return render_url($content, options.url, options);
                    } else {
                        throw({message: 'Missing required options'});
                    };
                }
            };
            return registry;
        }
    });

    // Default registry and access to it.
    var default_registry = module.Registry();

    $.extend(module, {
        view: function(definition) {
            default_registry.register(definition);
        },
        render: function($content, options) {
            return default_registry.render($content, options);
        }
    });

    $.fn.render = function(options) {
        return default_registry.render($(this), options);
    };

    infrae.views = module;
})(infrae, jQuery);