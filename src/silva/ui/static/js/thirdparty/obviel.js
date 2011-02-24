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
        'base': []
    };

    /**
     * Register an interface
     * @param name: interface name (string)
     */
    module.iface = function(name) {
        if (module._ifaces[name]) {
            throw((new module.DuplicateInterfaces(name)));
        };
        var bases = [];
        if (arguments.length > 1) {
            for (var i=arguments.length; i > 1; i--) {
                bases.unshift(arguments[i-1]);
            };
        } else {
            bases = ['base'];
        };

        for (var i=0; i < bases.length; i++) {
            var basebases = module._ifaces[bases[i]];
            if (basebases === undefined) {
                throw(
                    'while registering iface ' + name + ': ' +
                    'base iface ' + bases[i] + ' not found!');
            };
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
            if (base == 'base') {
                continue;
            };
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
                // XXX should we warn/error on unknown interfaces?
                bases = bases.concat(basebases);
            };
        };
        // XXX hrmph, dealing with base here to avoid having it in the list
        // too early... does that make sense?
        ret.push('base');
        ret.push(typeof obj);
        return ret;
    };

    /**
     * View
     * @param definition: definition of the view (object containing settings and methods)
     * @param element: DOM element on which the view will be rendered
     * @param data: data object used by the view to be rendered.
     */
    module.View = function(definition, element, data) {
        $.extend(this, definition);
        this.content = element;
        this.data = data;

        if (this.init) {
            this.init();
        };
    };

    // render the view
    module.View.prototype._render = function(callback) {
        this.content.trigger('cleanup.obviel');

        this._get_template(function(html) {
            this._render_template(html, callback);
            if (this.cleanup) {
                this.content.one('cleanup.obviel', function(event) {
                    if (this.content.get(0 ) === event.target) {
                        this.cleanup();
                    };
                }.scope(this));
            };
        }.scope(this));
    };

    // render the view using the given template
    module.View.prototype._render_template = function(template, callback) {
        if (this.iframe) {
            var iframe = $('<iframe src="">');

            iframe.height(this.content.height());
            iframe.width(this.content.width());
            this.content.html(iframe);
            if (template) {
                if (template.indexOf('<html') < 0 &&
                    template.indexOf('<HTML') < 0) {
                    // no html tags, add missing html tag
                    template = '<html><body>' + template + '</body></html>';
                };
                var template_window = iframe.get(0).contentWindow;
                var template_document = template_window.document;
                template_window.onload = function() {
                    if (this.render) {
                        this.render(this.content, this.data);
                    };
                }.scope(this);
                template_document.write(template);
                template_document.close();
            } else {
                if (this.render) {
                    this.render(this.content, this.data);
                };
            };
        } else {
            if (template) {
                this.content.html(template);
            };
            if (this.render) {
                this.render(this.content, this.data);
            }
        };
    };

    // template cache: mapping url or html to template instance or html
    module._template_cache = {};

    // retrieve a template for a view
    module.View.prototype._get_template = function(callback) {
        if (this.data.html || (this.html && !this.data.html_url) ||
            this.data.jsont || (this.jsont && !this.data.jsont_url)) {
            var jsont = (this.data.jsont || this.jsont);
            var html = null;
            if (jsont) {
                var template = module._template_cache[jsont];
                if (!template) {
                    template = new jsontemplate.Template(jsont, this.template_options);
                    module._template_cache[jsont] = template;
                };
                html = template.expand(this.data);
            } else {
                html = this.data.html || this.html;
            };
            callback(html);
        } else if (this.data.html_url || this.html_url ||
                   this.data.jsont_url || this.jsont_url) {
            // First look in the cache for data.
            var jsont = (this.data.jsont_url || this.jsont_url);
            var url = jsont;
            if (jsont) {
                var template = module._template_cache[jsont];
                if (template) {
                    callback(template.expand(this.data));
                    return;
                };
            } else {
                url = (this.data.html_url || this.html_url);
                var template = module._template_cache[url];
                if (template) {
                    callback(template);
                    return;
                };
            };
            $.ajax({
                type: 'GET',
                url: url,
                success: function(data) {
                    if (jsont) {
                        var template = new jsontemplate.Template(data, this.template_options);
                        module._template_cache[jsont] = template;
                        data = template.expand(this.data);
                    } else {
                        module._template_cache[url] = data;
                    };
                    callback(data);
                }.scope(this)
            });
        } else {
            // no explicit content, just call the callback
            callback();
        };
    };

    /**
     * Registery to used register views and render them.
     */
    module.Registry = function() {
        // Registered views
        this._views = {}; // name to dict {name: iface: view}
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
        if (definition.iface == undefined) {
            definition.iface = 'object';
        };
        if (definition.order == undefined) {
            definition.order = 0;
        };

        // Registration
        if (!this._views[definition.name]) {
            this._views[definition.name] = {};
        };
        if (!this._views[definition.name][definition.iface]) {
            this._views[definition.name][definition.iface] = [];
        };
        this._views[definition.name][definition.iface].unshift(definition);
    };

    // Render the most specialized view for a JSON object
    module.Registry.prototype._render_data = function(element, data, args) {
        var ifaces = module.ifaces(data);
        var views = this._views[args.name];
        var to_render = null;

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
        if (to_render != null) {
            to_render._render(args.callback);
        } else if (window.console && console.log) {
            console.log('failed view lookup for args', args, 'and', data);
        };
    };

    // Render all possible views for a given JSON object (viewlet like)
    module.Registry.prototype._render_every_data = function(element, data, args) {
        var ifaces = module.ifaces(data);
        var views = this._views[args.name];
        var to_render = [];

        if (views == undefined) {
            return;
        };
        $.each(ifaces, function (i, iface) {
            var definitions = views[iface];
            if (definitions) {
                $.each(definitions, function(e, definition) {
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
                });
            };
        });
        to_render.sort(function (v1, v2) {
            return v1.order - v2.order;
        });
        $.each(to_render, function (i, view) {
            view._render(args.callback);
        });
    };

    // Fetch an JSON object and render it.
    module.Registry.prototype._render_url = function(element, url, args) {
        $.ajax({
            type: 'GET',
            url: url,
            success: function(obj) {
                this._render_data(element, obj, args);
            }.scope(this),
            dataType: 'json'
        });
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
            this._render_data(element, args.data, args);
        } else if (args.every) {
            this._render_every_data(element, args.every, args);
        } else if(args.url) {
            this._render_url(element, args.url, args);
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
