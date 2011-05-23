
// Deferred

(function (infrae, $) {
    var module = {};

    $.extend(module, {
        /**
         * This is a simple list of callbacks callable multiple times.
         * (unlike a deferred). You can provide a default context
         * factory to create the this object that will be used as this
         * while calling the callbacks.
         */
        Callbacks: function(callbacks, context_provider) {
            if (!callbacks) {
                callbacks = [];
            };

            return {
                add: function(callback, invoke) {
                    if (invoke && context_provider)
                        callback.apply(context_provider());
                    callbacks.push(callback);
                    return callback;
                },
                clone: function() {
                    return module.Callbacks([].concat(callbacks), context_provider);
                },
                context: function(callback) {
                    context_provider = callback;
                },
                invoke: function(context, args) {
                    var index = callbacks.length;

                    if (!args && context_provider) {
                        var value = context_provider();

                        if (!context)
                            context = value;
                        else
                            args = [value];
                    };

                    while (index--) {
                        callbacks[index].apply(context, args);
                    };
                }
            };
        },
        /**
         * This implement a list of callbacks, that is called one
         * time, then a counter reach zero. You can increment and
         * decrement that counter.
         */
        StackCallbacks: function() {
            var value = 0;
            var callbacks = [];
            var last_args = undefined;

            return {
                use: function() {
                    value += 1;
                    last_args = undefined;
                },
                release: function(args) {
                    if (value) {
                        value -= 1;
                        if (value)
                            return;
                    };
                    // We reached Zero, invoke the callbacks.
                    while (callbacks.length) {
                        callbacks.pop()(args);
                    };
                    last_args = args;
                },
                call: function(callback) {
                    // If we have a value, delay the
                    // execution. Otherwise run it right away.
                    if (value)
                        callbacks.push(callback);
                    else
                        callback(last_args);
                }
            };
        }
    });


    $.extend(module, {
        FluxCapacitor: function() {
            var handlers = [{
                incoming: module.Callbacks(),
                outgoing: module.Callbacks(),
                failing: module.Callbacks()
            }];
            var data = [];

            return {
                /**
                 * Those are the default callbacks to use by default
                 * on the list of Deferred we manage.
                 */
                events: {
                    incoming: function(callback) {
                        infrae.utils.apply_on_each(data, callback);
                        return handlers[0].incoming.add(callback);
                    },
                    outgoing: function(callback) {
                        return handlers[0].outgoing.add(callback);
                    },
                    failing: function(callback) {
                        return handlers[0].failing.add(callback);
                    },
                    push: function() {
                        var copy = {};
                        for (var name in handlers[0]) {
                            copy[name] = handlers[0][name].clone();
                        };
                        handlers.unshift(copy);
                    },
                    pop: function() {
                        if (handlers.length > 1)
                            handlers.shift();
                    }
                },
                add: function(element) {
                    if ($.inArray(element, data) > -1)
                        return false;

                    handlers[0].incoming.invoke(element);
                    data.push(element);
                    return true;
                },
                each: function(callback) {
                    return infrae.utils.apply_on_each(data, callback);
                },
                map: function(callback) {
                    return infrae.utils.apply_on_map(data, callback);
                },
                remove: function(element, failed) {
                    var index = $.inArray(element, data);

                    if (index < 0)
                        return false;

                    data.splice(index, 1);
                    (failed ? handlers[0].failing : handlers[0].outgoing).invoke(element);
                    return true;
                },
                clear: function(failed) {
                    infrae.utils.each(data, (failed ? handlers[0].failing : handlers[0].outgoing).invoke);
                    data = [];
                    return true;
                }
            };
        }
    });

    infrae.deferred = module;
})(infrae, jQuery);