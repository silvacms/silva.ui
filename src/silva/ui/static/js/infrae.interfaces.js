
(function (infrae, $) {
    var module = {};

    // Interfaces are strings. the key is an interface name, the value
    // is a list of inherited ones.
    var interfaces = {};

    $.extend(module, {
        /**
         * Clear the registry.
         */
        clear: function() {
            interfaces = {};
        },
        /**
         * Register an interface
         * @param name: interface name (string)
         */
        register: function(name, bases) {
            if (interfaces[name]) {
                throw({message: 'Duplicate registration of interface ' + name});
            };
            if (!bases) {
                bases = [];
            };
            interfaces[name] = bases;
        },
        /**
         * Return a list of interface implemented by the object
         * @param object: object to interspect.
         */
        implemented_by: function(object) {
            if (object === undefined) {
                return [];
            }
            if (object.ifaces === undefined) {
                return [typeof object];
            };
            var result = [];
            var bases = [].concat(object.ifaces);

            while (bases.length) {
                var base = bases.shift();

                if ($.inArray(base, result) < 0) {
                    result.push(base);

                    var base_bases = interfaces[base];
                    if (base_bases) {
                        bases = bases.concat(base_bases);
                    };
                };
            };
            result.push(typeof object);
            return result;
        },
        /**
         * Returns true of object implements base, false otherwise.
         */
        is_implemented_by: function(base, object) {
            return $.inArray(base, module.implemented_by(object)) > -1;
        }
    });

    infrae.interfaces = module;
})(infrae, jQuery);
