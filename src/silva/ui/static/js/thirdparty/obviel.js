
var obviel = {};

(function($, module) {
    // Add a rescope method (used by this modules and other using obviel)
    if (Function.prototype.scope === undefined) {
        Function.prototype.scope = function(scope) {
            var _function = this;

            return function() {
                return _function.apply(scope, arguments);
            };
        };
    }

    // Exceptions
    module.DuplicateInterfaces = function(name) {
        this.message = 'duplicate registration of interface ' + name;
    };
    module.UnknownIface = function(name) {
        this.message = 'iface ' + name + ' not found';
    };
    module.InvalidOptions = function(options) {
        this.message = 'Missing required options';
    };

    // 'interface' implementation - interfaces are just strings that are
    // registered as a tree
    module._ifaces = {
    };

    /**
     * Register an interface
     * @param name: interface name (string)
     */
    module.iface = function(name, bases) {
        if (module._ifaces[name]) {
            throw((new module.DuplicateInterfaces(name)));
        };
        if (!bases) {
            bases = ['object'];
        };
        module._ifaces[name] = bases;
    };

    /**
     * Return a list of interface implemented by the object
     * @param obj: object to interspect.
     */
    module.ifaces = function(obj) {
        /* return the interfaces of an obj, breadth first
         */
        if (!obj.ifaces) {
            return [typeof obj];
        };
        var ret = [];
        var bases = [].concat(obj.ifaces);
        while (bases.length) {
            var base = bases.shift();
            var duplicate = false;
            for (var i=0; i < ret.length; i++) {
                if (base == ret[i]) {
                    duplicate = true;
                    break;
                };
            };
            if (duplicate) {
                continue;
            };
            ret.push(base);
            var basebases = module._ifaces[base];
            if (basebases) {
                bases = bases.concat(basebases);
            };
        };
        ret.push(typeof obj);
        return ret;
    };

    /**
     * Returns true of obj implements base, false otherwise
     */
    module.provides = function(obj, base) {
        var ifaces = module.ifaces(obj);
        for (var i=0; i < ifaces.length; i++) {
            if (ifaces[i] == base) {
                return true;
            };
        };
        return false;
    };

    /**
     * HTMLResource, load extra JS or CSS at run time.
     */
    module.HTMLResources = function() {
        this._js = [];
        this._css = [];
        $(document).ready(function() {
            this.populate();
        }.scope(this));
    };

    module.HTMLResources.prototype.populate = function() {
        $('script').each(function (i, script) {
            var src = $(script).attr('src');

            if (src != undefined && !this.is_js_loaded(src)) {
                this._js.push(src);
            };
        }.scope(this));
        $('link').each(function (i, link) {
            link = $(link);
            if (link.attr('rel') == 'stylesheet' && link.attr('type') == 'text/css') {
                var src = link.attr('href');
                if (src != undefined && !this.is_css_loaded(src)) {
                    this._css.push(src);
                };
            };
        }.scope(this));
    };

    /**
     * Return true if the given Javascript is already loaded.
     * @param script: url of the Javascript file.
     */
    module.HTMLResources.prototype.is_js_loaded = function(script) {
        return $.inArray(script, this._js) >= 0;
    };

    /**
     * Return true if the given CSS is already loaded.
     * @param css: url of the CSS file.
     */
    module.HTMLResources.prototype.is_css_loaded = function(css) {
        return $.inArray(css, this._css) >= 0;
    };

    /**
     * Load a given JS file.
     * @param script: url of the JS file.
     */
    module.HTMLResources.prototype.load_js = function(script) {
        if (!this.is_js_loaded(script)) {
            // We don't use jQuery here, as does strange things with scripts.
            var head = document.getElementsByTagName('head')[0];
            var script_tag = document.createElement('script');

            script_tag.type = 'text/javascript';
            script_tag.src = script;
            head.appendChild(script_tag);

            this._js.push(script);
        };
    };

    /**
     * Load a given CSS file.
     * @param css: url of the CSS file.
     */
    module.HTMLResources.prototype.load_css = function(css) {
        if (!this.is_css_loaded(css)) {
            // We don't use jQuery here, as does strange things with links.
            var head = document.getElementsByTagName('head')[0];
            var link_tag = document.createElement('link');

            link_tag.rel = 'stylesheet';
            link_tag.type = 'text/css';
            link_tag.href = css;
            head.appendChild(link_tag);

            this._css.push(css);
        };
    };

    module._resources = new module.HTMLResources();

    /**
     * View
     * @param definition: definition of the view (object containing settings and methods)
     * @param element: DOM element on which the view will be rendered
     * @param data: data object used by the view to be rendered.
     */
    module.View = function(definition, element, data) {
        $.extend(this, definition);
        this.$content = element;
        this.data = data;

        if (this.init) {
            this.init();
        };
    };

    // finish to render the view using the given template
    module.View.prototype._render = function(render, template) {
        // Clean content if needed (call cleanup callback)
        this.$content.triggerHandler('cleanup-obviel');

        if (this.cleanup) {
            // Install new cleanup callback
            this.$content.one('cleanup-obviel', function(event) {
                this.cleanup();
            }.scope(this));
        };

        // Insert content and call render.
        if (this.iframe) {
            var iframe = $('<iframe src="">');

            iframe.height(this.$content.height());
            iframe.width(this.$content.width());
            this.$content.html(iframe);
            if (template) {
                if (template.indexOf('<html') < 0 &&
                    template.indexOf('<HTML') < 0) {
                    // no html tags, add missing html tag
                    template = '<html><body>' + template + '</body></html>';
                };
                var template_window = iframe.get(0).contentWindow;
                var template_document = template_window.document;
                template_window.onload = function() {
                    render();
                };
                template_document.write(template);
                template_document.close();
            } else {
                render();
            };
        } else {
            if (template) {
                this.$content.html(template);
            };
            render();
        };
    };

    // template cache: mapping url or html to template instance or html
    module._template_cache = {};

    // render the view: retrieve a template to render it and render it
    module.View.prototype._fetch_and_render = function(callback) {

        // Make a finalizer that call render and the callback
        var finalizer = function() {
            if (this.render != undefined)
                this.render(this.$content, this.data);
            if (callback != undefined)
                callback(this);
        }.scope(this);

        // Resources
        var resources = this.data.html_resources || this.html_resources;
        if (resources) {
            if (resources.js) {
                $.each(resources.js, function(i, script) {
                    module._resources.load_js(script);
                });
            };
            if (resources.css) {
                $.each(resources.css, function(i, css) {
                    module._resources.load_css(css);
                });
            };
        };

        // Remote JSON
        var jsont_url = this.data_template && this.data.jsont_url || this.jsont_url;
        if (jsont_url) {
            var template = module._template_cache[jsont_url];

            if (template) {
                return this._render(finalizer, template.expand(this));
            };
            $.ajax({
                type: 'GET',
                url: jsont_url,
                success: function(data) {
                    var template = new jsontemplate.Template(data, this.template_options);
                    module._template_cache[jsont_url] = template;
                    data = template.expand(this.data);
                    this._render(finalizer, data);
                }.scope(this)
            });
            return this;
        };

        // Remote HTML
        var html_url = this.data_template && this.data.html_url || this.html_url;
        if (html_url) {
            // First look in the cache for data.
            if (!this.nocache) {
                var template = module._template_cache[html_url];
                if (template) {
                    return this._render(finalizer, template);
                };
            };
            $.ajax({
                type: 'GET',
                url: html_url,
                success: function(data) {
                    module._template_cache[html_url] = data;
                    this._render(finalizer, data);
                }.scope(this)
            });
            return this;
        };

        // Local JSON
        var jsont = this.data_template && this.data.jsont || this.jsont;
        if (jsont) {
            var template = module._template_cache[jsont];

            if (!template) {
                template = new jsontemplate.Template(
                    jsont, this.template_options);
                module._template_cache[jsont] = template;
            };
            return this._render(finalizer, template.expand(this));
        };

        // Local HTML
        var html = this.data_template && this.data.html || this.html;
        if (html) {
            return this._render(finalizer, html);
        };

        // No explicit content, just call render.
        return this._render(finalizer);
    };

    /**
     * Registery to used register views and render them.
     */
    module.Registry = function() {
        // Registered views
        this._views = {}; // name to dict {name: iface: view}
        this._count = 0;
    };

    /**
     * Register a new view.
     * @param definition: associated definition for the view.
     */
    module.Registry.prototype.register = function(definition) {
        /* the view is registered by viewobj.name, defaulting to 'default',
           and viewobj.iface, defaulting to 'object' (which is implemented
           by all JS objects), and order to 0 (used for multiple rendering).
        */
        // Default values.
        if (definition.name == undefined) {
            definition.name = 'default';
        };
        if (definition.order == undefined) {
            definition.order = 0;
        };

        definition['__obviel_uid__'] = this._count.toString();
        this._count += 1;

        var views = this._views;
        var add = function(definition) {
            if (!views[definition.name]) {
                views[definition.name] = {};
            };
            if (!views[definition.name][definition.iface]) {
                views[definition.name][definition.iface] = [];
            };
            views[definition.name][definition.iface].unshift(definition);
        };

        // Registration multiple or simple
        if (definition.ifaces) {
            $.each(definition.ifaces, function(i, iface) {
                definition.iface = iface;
                add(definition);
            });
        } else {
            // Default
            if (definition.iface == undefined) {
                definition.iface = 'object';
            };
            add(definition);
        };
    };

    // Render the most specialized view for a JSON object
    module.Registry.prototype._render_data = function(element, data, args) {
        var ifaces = args.ifaces || module.ifaces(data);
        var views = this._views[args.name];
        var to_render = undefined;

        if (views) {
            for (var i=0; i < ifaces.length; i++) {
                var definitions = views[ifaces[i]];
                if (definitions && definitions.length) {
                    var view_definition = {};
                    $.extend(view_definition, definitions[0]);
                    if (args.extra) {
                        $.extend(view_definition, args.extra);
                    };
                    to_render = new module.View(view_definition, element, data);
                    break;
                };
            };
        };
        if (to_render != undefined) {
            to_render._fetch_and_render(args['onrender']);
        } else if (window.console && console.log) {
            console.log('failed view lookup for args', args, 'and', data);
        };
        return to_render;
    };

    // Render all possible views for a given JSON object (viewlet like)
    module.Registry.prototype._render_every_data = function(element, data, args) {
        var ifaces = args.ifaces || module.ifaces(data);
        var views = this._views[args.name];
        var seen_definitions = [];
        var to_render = [];

        if (views == undefined) {
            return [];
        };
        $.each(ifaces, function (i, iface) {
            var definitions = views[iface];
            if (definitions) {
                $.each(definitions, function(e, definition) {
                    if ($.inArray(definition['__obviel_uid__'], seen_definitions) < 0) {
                        var view_definition = {};
                        $.extend(view_definition, definition);
                        if (args.extra) {
                            $.extend(view_definition, args.extra);
                        };
                        var view = new module.View(view_definition, element, data);
                        if (view.available != undefined)
                            if (!view.available()) {
                                return;
                            };
                        to_render.push(view);
                        seen_definitions.push(definition['__obviel_uid__']);
                    };
                });
            };
        });
        to_render.sort(function (v1, v2) {
            return v1.order - v2.order;
        });
        $.each(to_render, function (i, view) {
            view._fetch_and_render(args['onrender']);
        });
        return to_render;
    };

    // Fetch an JSON object and render it.
    module.Registry.prototype._render_url = function(element, url, args) {
        $.ajax({
            type: 'GET',
            url: url,
            success: function(data) {
                this._render_data(element, data, args);
            }.scope(this),
            dataType: 'json'
        });
        return undefined;
    };

    /**
     * Render a View.

     arguments are provided as an object:

     * data - the object to render using the view
     * every - alternative object
     * url - alternative url
     * name - the name of the view to render, optional, defaults to
     'default'
     * callback - optional, a function that is called after the
     rendering has completed, with args 'element' (the JQuery-wrapped
     element that the view is executed on), 'view' (the view
     instance) and 'context' (a reference to 'obj')
    */
    module.Registry.prototype.render = function(element, args) {
        if (!args.name) {
            args.name = 'default';
        };

        if (args.data) {
            return this._render_data(element, args.data, args);
        } else if (args.every) {
            return this._render_every_data(element, args.every, args);
        } else if(args.url) {
            return this._render_url(element, args.url, args);
        } else {
            throw((new module.InvalidOptions(args)));
        };
    };

    // Default registry and access to it.
    module._default_registry = new module.Registry();

    module.view = function(definition) {
        module._default_registry.register(definition);
    };

    $.fn.render = function(args) {
        module._default_registry.render($(this), args);
    };

})(jQuery, obviel);
