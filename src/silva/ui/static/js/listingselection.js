
(function($, infrae) {

    $.fn.SMISelection = function() {
        var deferred = null;
        var callbacks = infrae.deferred.Callbacks();

        var new_deferred = function() {
            deferred = infrae.deferred.MetaDeferred('selection');

            deferred.always(function() {
                deferred = null;
            });

            // Default behavior of a SMI Selection.
            deferred.template.until(function(element) {
                $(element).addClass('selected');
            });
            deferred.template.done(function(element) {
                $(element).removeClass('selected');
            });
            deferred.template.fail(function(element) {
                $(element).remove();
            });
        };

        return {
            select: function($items) {
                var changed = false;

                if ($items.length) {
                    if (deferred == null) {
                        new_deferred();
                    };
                    $items.each(function () {changed |= deferred.add(this);});
                };
                if (changed)
                    callbacks.invoke($items);
                return changed;
            },
            unselect: function($items) {
                var changed = false;

                if (deferred != null) {
                    $items.each(function () { changed |= deferred.remove(this, true);});
                };
                if (changed)
                    callbacks.invoke($items);
                return changed;
            },
            remove: function($items) {
                var changed = false;

                if (deferred != null) {
                    $items.each(function () { changed |= deferred.remove(this, false);});
                };
                if (changed)
                    callbacks.invoke($items);
                return changed;
            },
            toggle: function($items) {
                var changed = false;

                $items.each(function () {
                    if ($(this).hasClass('selected')) {
                        if (deferred != null)
                            changed |= deferred.remove(this, true);
                    } else {
                        if (deferred == null)
                            new_deferred();
                        changed |= deferred.add(this);
                    };
                });
                if (changed)
                    callbacks.invoke($items);
                return changed;
            },
            events: {
                always: function(callback) {
                    callbacks.add(callback);
                },
                promise: function() {
                    if (deferred == null) {
                        return null;
                    };
                    return deferred.promise();
                }
            }
        };
    };

})(jQuery, infrae);
