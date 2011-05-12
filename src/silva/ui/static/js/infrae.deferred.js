
// Deferred

(function (infrae, $) {
    var module = {};

    $.extend(module, {
        /**
         * This is a simple list of callbacks callable multiple times.
         * (unlike a deferred).
         */
        Callbacks: function() {
            var callbacks = [];

            return {
                add: function(callback) {
                    callbacks.push(callback);
                    return this;
                },
                invoke: function(context, args) {
                    var index = callbacks.length;

                    while (index--) {
                        callbacks[index].apply(context, args);
                    };
                },
                clear: function() {
                    callbacks = [];
                }
            };
        }
    });

    var promiseMethods = "done fail isResolved isRejected promise then always pipe until template".split(" ");

    $.extend(module, {
        /**
         * Extended version of jQuery Deferred. This have an until and
         * workWith method. until register a simple list of callback
         * that are used each time workWith is called, up until the
         * deferred is resolved or rejected.
         */
        Deferred: function() {
            var deferred = $.Deferred();
            var callbacks = module.Callbacks();
            var working = true;
            var promise = null;

            deferred.always(function() {
                working = false;
                callbacks.clear();
            });
            $.extend(deferred, {
                // Trigger until if needed.
                workWith: function() {
                    if (working)
                        callbacks.invoke(this, arguments);
                },
                // Callback to be called when workWith is called.
                until: function(callback) {
                    callbacks.add(callback);
                },
                // We have to redefine promise to include until
                promise: function(obj) {
                    if (obj == null) {
                        if (promise) {
                            return promise;
                        };
                        promise = obj = {};
                    };
                    var index = promiseMethods.length;

                    while(index--) {
                        if (deferred[promiseMethods[index]] != undefined)
                            obj[promiseMethods[index]] = deferred[promiseMethods[index]];
                    };
                    return obj;
                }
            });
            return deferred;
        },
        /**
         * A MetaDeferred manage a list of Deferred on other
         * objects. You can add or remove objects, resolving or
         * rejecting their deferred. The MetaDeferred is resolved once
         * all managed Deferred are either resolved or rejected.
         */
        MetaDeferred: function(type) {
            var data = [];
            var finishing = false;
            // Using $.data and a defer key make $.promise works.
            var masterkey = (type || 'meta') + 'defer';
            var deferred = module.Deferred();

            var template = {
                fail: [],
                done: [],
                until: []
            };

            $.extend(deferred, {
                /**
                 * Those are the default callbacks to use by default
                 * on the list of Deferred we manage.
                 */
                template: {
                    always: function(callback, retro_active) {
                        template.done.push(callback);
                        template.fail.push(callback);
                        if (retro_active) {
                            deferred.each(function() {
                                this.always(callback);
                            });
                        };
                    },
                    until: function(callback, retro_active) {
                        template.until.push(callback);
                        if (retro_active) {
                            deferred.each(function(element) {
                                this.until(callback);
                                this.workWith(element);
                            });
                        };
                    },
                    fail: function(callback, retro_active) {
                        template.fail.push(callback);
                        if (retro_active) {
                            deferred.each(function() {
                                this.fail(callback);
                            });
                        };
                    },
                    done: function(callback, retro_active) {
                        template.done.push(callback);
                        if (retro_active) {
                            deferred.each(function() {
                                this.done(callback);
                            });
                        };
                    }
                },
                add: function(element) {
                    if ($.inArray(element, data) > -1)
                        return false;

                    var value = module.Deferred();
                    infrae.utils.map(template.fail, value.fail);
                    infrae.utils.map(template.done, value.done);
                    infrae.utils.map(template.until, value.until);

                    $(element).data(masterkey, value);
                    data.push(element);
                    value.workWith(element);
                    return true;
                },
                get: function($element) {
                    var index = $.inArray($element, data);

                    if (index < 0)
                        return null;
                    return data[index].data(masterkey);
                },
                each: function(callback) {
                    var index = data.length;

                    while(index--) {
                        var value = $(data[index]).data(masterkey);
                        callback.apply(value, [data[index]]);
                    };
                },
                remove: function(element, success) {
                    var index = $.inArray(element, data);

                    if (index < 0)
                        return false;

                    var value = $(element).data(masterkey);
                    $(element).removeData(masterkey);
                    data.splice(index, 1);
                    if (success)
                        value.resolve(element);
                    else
                        value.reject(element);
                    if (!finishing && !data.length)
                        deferred.resolve();
                    return true;
                }
            });

            // If we are prematurely done, do all remaining values.
            deferred.done(function() {
                finishing = true;
                deferred.each(function() {this.done();});
            });
            deferred.fail(function() {
                finishing = true;
                deferred.each(function() {this.fail();});
            });

            return deferred;
        }
    });

    infrae.deferred = module;
})(infrae, jQuery);
