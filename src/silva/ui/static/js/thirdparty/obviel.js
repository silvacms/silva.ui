var obviel = {};

(function($, module) {
    // XXX use an error reporting system similar to what form.js uses...
    module.onerror = function(e) {
        if (window.console && console.log) {
            console.log(e);
        } else {
            var msg;
            if (e.message && e.name) {
                msg = e.name + ': ' + e.message;
            } else if (e.message) {
                msg = e.message;
            } else {
                msg = e.toString();
            };
            alert(msg);
        };
        throw(e);
    };

    // 'interface' implementation - interfaces are just strings that are
    // registered as a tree
    module._ifaces = {
        'base': []
    };

    module.iface = function(name) {
        /* register an interface

           register an iface with name 'name' (string), if other arguments
           are passed to this function, consider the rest base ifaces
           (supers), in order of importance

           interfaces are just strings, used as markers

           note that if an iface is registered, it automatically inherits
           from 'base'
        */
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

    module.implements = function(obj, base) {
        /* returns true of obj implements base, false otherwise
        */
        var ifaces = module.ifaces(obj);
        for (var i=0; i < ifaces.length; i++) {
            if (ifaces[i] == base) {
                return true;
            };
        };
        return false;
    };

    module.extendsIface = function(name, base) {
        /* register a new base for interface name
        */
        var basebases = module._ifaces[base];
        if (basebases === undefined) {
            throw((new module.UnknownIface(base)));
        };
        for (var i=0; i < basebases.length; i++) {
            if (basebases[i] == name) {
                throw((new module.RecursionError(name, basebases[i])));
            };
        };
        module._ifaces[name].push(base);
    };

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

    // Registered views
    module._views = {}; // name to dict {iface: name: view}

    // Exceptions
    module.DuplicateInterfaces = function(name) {
        this.message = 'duplicate registration of interface ' + name;
    };

    module.RecursionError = function(name, base) {
        this.message = 'recursion on base ' + base + ' for name ' + name;
    };

    module.UnknownIface = function(name) {
        this.message = 'iface ' + name + ' not found';
    };
    module.InvalidOptions = function(options) {
        this.message = 'Missing required options';
    };

    // View class
    module.View = function(definition, element, data) {
        $.extend(this, definition);
        this.content = element;
        this.data = data;

        if (this.init) {
            this.init();
        };
    };

    module.View.prototype.doRender = function(name, callback) {
        this.content.trigger('cleanup.obviel');

        this._get_template(function(html) {
            this._process_content(html, name, callback);
            if (this.cleanup) {
                this.content.one('cleanup.obviel', this.cleanup.scope(this));
            };
        }.scope(this));
    };

    module.View.prototype._process_content = function(template, name, callback) {
        if (this.iframe) {
            var iframe = document.createElement('iframe');
            iframe.src = '';
            this.content.html(iframe);
            if (template) {
                var self = this;
                var cw = iframe.contentWindow;
                var cd = cw.document;
                if (template.indexOf('<html') == -1 &&
                        template.indexOf('<HTML') == -1) {
                    // no html tags, assume it's body content rather than a
                    // full doc
                    template = '<html><body>' + template + '</body></html>';
                };
                cd.write(template);
                var onload = cw.onload = function() {
                    var iframe = this.content[0].childNodes[0];
                    function cbwrapper() {
                        var jiframe = $(iframe);
                        var jcontents = $(cd);
                        $('body', jcontents).css('overflow', 'hidden');
                        // deal with margin, though not sure where...
                        jiframe.width(jcontents.width() + 2);
                        jiframe.height(jcontents.height() + 2);
                        if (callback) {
                            callback.apply(this, arguments);
                        };
                    };
                    if (this.render) {
                        this.render(this.content, this.data);
                    }
                };
                cd.close();
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

    module._template_cache = {}; // mapping url or html to template instance
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

    /* view registration

       use $.view(viewobj) to register a view instance

       view objects should support a 'render' method that will be called when
       the view is rendered - with the element, a context obj and the
       registered name as arguments - and can optionally have an attr 'name'
       that gives the view a name (defaulting to 'default') and an 'iface' attr
       that defines what kind of context object ifaces are accepted (these are
       merely string markers, no real iface objects)
    */
    module.view = function(definition) {
        /* register a view

           the view is registered by viewobj.name, defaulting to 'default',
           and viewobj.iface, defaulting to 'object' (which is implemented
           by all JS objects)
        */
        // Default values.
        if (definition.name == undefined) {
            definition.name = 'default';
        };
        if (definition.iface == undefined) {
            definition.iface = 'object';
        };

        // Registration
        if (!module._views[definition.iface]) {
            module._views[definition.iface] = {};
        };
        module._views[definition.iface][definition.name] = definition;
    };

    module._render_from_obj = function(element, data, args) {
        var ifaces = module.ifaces(data);

        for (var i=0; i < ifaces.length; i++) {
            var definitions = module._views[ifaces[i]];
            if (definitions) {
                var definition = definitions[args.name];
                if (definition) {
                    var view_definition = {};
                    $.extend(view_definition, definition);
                    if (args.extra) {
                        $.extend(view_definition, args.extra);
                    };
                    var view = new obviel.View(view_definition, element, data);
                    view.doRender(args.name, args.callback);
                    return;
                };
            };
        };
        if (window.console && console.log) {
            console.log('failed view lookup for args', args, 'and', data);
        };
    };

    module._render_from_url = function(element, url, args) {
        $.ajax({
            type: 'GET',
            url: url,
            success: function(obj) {
                module._render_from_obj(element, obj, args);
            },
            dataType: 'json'
        });
    };

    $.fn.render = function(args) {
        /* render a view

           look up the view by name, defaulting to 'default', and
           obj.ifaces, defaulting to [<typeof object>]

           arguments supported are:

             * obj - the context object
             * name - the name of the view to render, optional, defaults to
               'default'
             * callback - optional, a function that is called after the
               rendering has completed, with args 'element' (the JQuery-wrapped
               element that the view is executed on), 'view' (the view
               instance) and 'context' (a reference to 'obj')
             * errback - optional, a function that is called if an error
               occurs, with as argument the error instance - note that this is
               only recognized properly if a 'callback' argument is provided
        */
        var element = $(this);
        if (!args.name) {
            args.name = 'default';
        };

        if (args.data) {
            module._render_from_obj(element, args.data, args);
        } else if(args.url) {
            module._render_from_url(element, args.url, args);
        } else {
            throw((new module.InvalidOptions(data)));
        };
    };

})(jQuery, obviel);
