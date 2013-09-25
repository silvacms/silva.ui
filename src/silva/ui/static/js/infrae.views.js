
(function ($, infrae, jsontemplate) {
    var BUNDLE_RE = /^:bundle:/;

    // Disable all ajax caching, for IE 8.
    $.ajaxSetup({
        cache:false
    });

    var HTMLResourceTracker = function() {
        var urls = [];

        var analyze_url = function(original) {
            var parts = original.split('/'),
                last = parts[parts.length - 1];

            if (last.match(BUNDLE_RE)) {
                parts.pop();

                var files = last.substr(8).split(';'),
                    prefix = parts.join('/'),
                    result = [],
                    i;

                for (i=0; i < files.length; i++) {
                    result.push({url: [prefix, files[i]].join('/'),
                                 file: files[i],
                                 prefix: prefix});
                };
                return result;
            };
            return [{url: original, file: null, prefix: original}];
        };

        return {
            register: function(new_url) {
                var new_urls = analyze_url(new_url),
                    i;

                for (i=0; i < new_urls.length; i++) {
                    if ($.inArray(new_urls[i].url, urls) < 0) {
                        urls.push(new_urls[i].url);
                    };
                };
            },
            validate: function(new_url) {
                // This can probably be optimized.
                var new_urls = analyze_url(new_url),
                    missing_urls = {},
                    result = [],
                    i, prefix, files;

                for (i=0; i < new_urls.length; i++) {
                    if ($.inArray(new_urls[i].url, urls) < 0) {
                        prefix = new_urls[i].prefix;
                        if (missing_urls[prefix] === undefined) {
                            missing_urls[prefix] = [];
                        };
                        missing_urls[prefix].push(new_urls[i]);
                    };
                };
                for (prefix in missing_urls) {
                    if (missing_urls[prefix].length == 1 && missing_urls[prefix][0].file === null) {
                        result.push(missing_urls[prefix][0].url);
                    } else {
                        files = [];
                        for (i=0; i < missing_urls[prefix].length; i++) {
                            files.push(missing_urls[prefix][i].file);
                        };
                        result.push([prefix, ':bundle:' + files.join(';')].join('/'));
                    };
                };
                return result;
            }
        };
    };

    var module = {
        /**
         * HTMLResourceManager, load extra JS or CSS at run time.
         */
        HTMLResourceManager: function($document) {
            var data = {
                css: HTMLResourceTracker(),
                js: HTMLResourceTracker()
            };
            var root = $document.get(0);
            var head = root.getElementsByTagName('head')[0];

            var resources = {
                /**
                 * Load given JS files.
                 * @param script: list containing urls of the JS files.
                 */
                load_js: function(scripts) {
                    var urls = infrae.utils.map_concat(scripts, data.js.validate);

                    if (urls.length) {
                        return $.when.apply($, infrae.utils.map(urls, function(url) {
                            // We don't use jQuery here, as does strange things with scripts.
                            var script_tag = root.createElement('script'),
                                promise = $.Deferred();

                            script_tag.async = 'async';
                            script_tag.type = 'text/javascript';
                            if (script_tag.readyState) {
                                script_tag.onreadystatechange = function () {
                                    if (script_tag.readyState == "loaded" ||
                                        script_tag.readyState == "complete") {
                                        script_tag.onreadystatechange = null;
                                        promise.resolve();
                                    };
                                };
                            } else {
                                script_tag.onload = function() {
                                    promise.resolve();
                                };
                            };
                            script_tag.src = url;
                            head.appendChild(script_tag);
                            data.js.register(url);
                            return promise;
                        }));
                    };
                    return $.Deferred().resolve();
                },
                /**
                 * Load given CSS files.
                 * @param css: list containing urls of the CSS files.
                 */
                load_css: function(csses) {
                    var urls = infrae.utils.map_concat(csses, data.css.validate);

                    if (urls.length) {
                        return $.when.apply($, infrae.utils.map(urls, function(url) {
                            // We don't use jQuery here, as does strange things with links.
                            var link_tag = root.createElement('link');

                            link_tag.rel = 'stylesheet';
                            link_tag.type = 'text/css';
                            link_tag.href = url;
                            head.appendChild(link_tag);
                            data.css.register(url);
                            // We should use load event here too.
                            return $.Deferred().resolve();
                        }));
                    };
                    return $.Deferred().resolve();
                }
            };

            $document.ready(function() {
                $('script').each(function () {
                    var src = $(this).attr('src');

                    if (src != undefined) {
                        data.js.register(src);
                    };
                });
                $('link').each(function () {
                    var $link = $(this);

                    if ($link.attr('rel') == 'stylesheet' && $link.attr('type') == 'text/css') {
                        var src = $link.attr('href');
                        if (src != undefined) {
                            data.css.register(src);
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

        // Finish to render the view using the given template
        var render = function(template) {
            if (!view.template_append) {
                // Clean content if needed (call cleanup callback)
                $content.triggerHandler('cleanup-infrae-views');

                if (view.cleanup || view.iframe) {
                    // Install new cleanup callback
                    $content.one('cleanup-infrae-views', function() {
                        if (view.cleanup) {
                            view.cleanup();
                        };
                        if (view.iframe) {
                            $(window).unbind('resize.infrae-views-iframe');
                            $(window).unbind('workspace-resize-smi.infrae-views-iframe');
                            $content.removeClass('iframe-view');
                        };
                    });
                };
            };

            // Make a finalizer that call render and finish.
            var deferred = $.Deferred();
            var $context = $content;
            var resolve = function() {
                if (reject != undefined) {
                    deferred.rejectWith(view, reject);
                } else {
                    deferred.resolveWith(view);
                };
            };
            var finalizer = function() {
                var done = null;

                if (view.render != undefined) {
                    done = view.render($context);
                    if (done && done.promise) {
                        done.promise().done(resolve);
                        return;
                    };
                };
                resolve();
            };

            // Insert content and call render.
            if (view.iframe) {
                if (view.template_append) {
                    throw {message: 'Cannot use iframe and template_append together'};
                };
                var $iframe = $('<iframe src="">');

                // We need to provide view access to those. This isn't the best but it works.
                view.$iframe = $iframe;

                var resize = function() {
                    var height = $content.innerHeight(),
                        width = $content.innerWidth();
                    if (!view.resize_iframe || !view.resize_iframe(width, height))  {
                        $iframe.height(height);
                        $iframe.width(width);
                    };
                };
                resize();
                $(window).bind('resize.infrae-views-iframe', resize);
                $(window).bind('workspace-resize-smi.infrae-views-iframe', resize);
                $content.addClass('iframe-view');
                $content.html($iframe);

                var iframe_window = $iframe.get(0).contentWindow;
                var iframe_document = iframe_window.document;
                view.$window = $(iframe_window);
                view.$document = $(iframe_document);

                if (template !== undefined) {
                    view.ready = $.Deferred();

                    var loader = function() {
                        view.ready.resolve(view);
                    };

                    if (template.indexOf('<html') < 0 &&
                        template.indexOf('<HTML') < 0) {
                        // No html tags, add missing html tag
                        template = '<html><body>' + template + '</body></html>';
                    };
                    iframe_document.write(template);
                    iframe_document.close();
                    if (iframe_document.readyState == "complete") {
                        loader();
                    } else if (iframe_window.addEventListener) {
                        iframe_window.addEventListener("load", loader, false);
                    } else {
                        iframe_window.attachEvent("onload", loader);
                    };
                };
            } else {
                if (template !== undefined) {
                    if (view.template_append) {
                        $context = $(template);
                        $content.append($context);
                    } else {
                        $content.html(template);
                    };
                };
            };
            finalizer();
            return deferred.promise();
        };

        // render the view: retrieve a template to render it and render it
        return function() {
            var template = undefined;
            // Remote JSON
            var jsont_url = view.template_data && data.jsont_url || view.jsont_url;
            if (jsont_url) {
                // First look in the cache for data.
                if (!view.template_nocache) {
                    template = template_cache[jsont_url];
                    if (template !== undefined) {
                        return render(template.expand(view));
                    };
                };
                return $.ajax({
                    type: 'GET',
                    url: jsont_url
                }).then(function (payload) {
                    var template = new jsontemplate.Template(payload, {});
                    template_cache[jsont_url] = template;
                    return render(template.expand(data));
                });
            };

            // Remote HTML
            var html_url = view.template_data && data.html_url || view.html_url;
            if (html_url) {
                // First look in the cache for data.
                if (!view.template_nocache) {
                    template = template_cache[html_url];
                    if (template !== undefined) {
                        return render(template);
                    };
                };
                return $.ajax({
                    type: 'GET',
                    url: html_url
                }).then(function (payload) {
                    template_cache[html_url] = payload;
                    return render(payload);
                });
            };

            // Local JSON
            var jsont = view.template_data && data.jsont || view.jsont;
            if (jsont !== undefined) {
                template = template_cache[jsont];

                if (template === undefined) {
                    template = new jsontemplate.Template(jsont, {});
                    template_cache[jsont] = template;
                };
                return render(template.expand(view));
            };

            // Local HTML
            var html = view.template_data && data.html || view.html;
            if (html !== undefined) {
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
                var ifaces = options.ifaces || infrae.interfaces.implemented_by(data);
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
                return $.Deferred().reject({status: 604});
            };

            // Render all possible views for a given JSON object (viewlet like)
            var render_all_views = function($content, data, options) {
                var named_views = views[options.name];

                if (named_views == undefined) {
                    return [];
                };

                var ifaces = options.ifaces || infrae.interfaces.implemented_by(data);
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
                }).then(function(data) {
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
})(jQuery, infrae, jsontemplate);
