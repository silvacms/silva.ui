
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
            var saved = [];

            return {
                add: function(callback, invoke) {
                    if (invoke && context_provider) {
                        callback.apply(context_provider());
                    };
                    callbacks.push(callback);
                    return callback;
                },
                push: function() {
                    saved.push(callbacks);
                    callbacks = [];
                },
                pop: function() {
                    if (saved.length > 0) {
                        callbacks = saved.pop();
                    };
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
                    if (!args)  // For IE 8
                        args = [];

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
        SemaphoreCallbacks: function() {
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
                        if (value) {
                            return;
                        };
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
                    if (value) {
                        callbacks.push(callback);
                    } else {
                        callback(last_args);
                    };
                }
            };
        },
        /**
         * This call a list of callbacks on an array, when it have
         * time. You can use reset to cancel the call.
         */
        LazyCallbacks: function() {
            var timeout = null;
            var jobs = [];

            var Job = function (array, callback) {
                var deferred = $.Deferred();
                var results = [];
                var index = 0;
                var len = array.length;
                var job = {
                    run: function() {
                        var start = +new Date();

                        while (index < len) {
                            results.push(callback(array[index]));
                            index += 1;
                            if (+new Date() - start > 50) {
                                timeout = setTimeout(job.run, 25);
                                return;
                            };
                        };
                        timeout = null;
                        jobs.shift();
                        if (jobs.length) {
                            jobs[0].run();
                        };
                        deferred.resolve(results);
                    },
                    deferred: deferred
                };
                return job;
            };

            return {
                reset: function() {
                    var index = jobs.length;

                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    };
                    while (index--) {
                        jobs[index].deferred.reject();
                    };
                    jobs = [];
                },
                add: function(array, callback) {
                    var idle = jobs.length === 0;
                    var job = Job(array, callback);

                    jobs.push(job);
                    if (idle) {
                        job.run();
                    };

                    return job.deferred.promise();
                }
            };
        },
        FluxCapacitor: function() {
            /**
             * This holds elements in a list. A callback is executed
             * when items are added to the list, and removed. You have
             * to different callback while removing items, either
             * normal (outgoing) or with error (failing). Some other
             * convience functions let you execute execute other
             * callbacks on the items.
             */
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
