
(function($, infrae) {

    $.fn.SMISelection = function() {
        var deferred = null;

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
            /**
             * Select a set of $items.
             */
            select: function($items) {
                var changed = false;

                if ($items.length) {
                    if (!deferred) {
                        new_deferred();
                    };
                    $items.each(function () {changed |= deferred.add(this);});
                };
                return changed;
            },
            /**
             * Unselect a set of $items.
             */
            unselect: function($items) {
                var changed = false;

                if (deferred) {
                    $items.each(function () { changed |= deferred.remove(this, true);});
                };
                return changed;
            },
            /**
             * Remove a set of $items (so they are unselected).
             */
            remove: function($items) {
                var changed = false;

                if (deferred) {
                    $items.each(function () { changed |= deferred.remove(this, false);});
                };
                return changed;
            },
            /**
             * Toggle the selection for a set of $items.
             */
            toggle: function($items) {
                var changed = false;

                $items.each(function () {
                    if ($(this).hasClass('selected')) {
                        if (deferred)
                            changed |= deferred.remove(this, true);
                    } else {
                        if (!deferred)
                            new_deferred();
                        changed |= deferred.add(this);
                    };
                });
                return changed;
            },
            /**
             * Return data associated to selected items.
             */
            data: function() {
                if (!deferred)
                    return {ifaces: [], items: [], length: 0, promise: null};

                var ifaces = [];
                var data = [];

                deferred.each(function (item) {
                    var $item = $(item);
                    var local_data = $item.data('smilisting');

                    for (var e=0; e < local_data.ifaces.length; e++) {
                        if ($.inArray(local_data.ifaces[e], ifaces) < 0) {
                            ifaces.push(local_data.ifaces[e]);
                        };
                    };
                    data.push(local_data);
                });
                return {
                    ifaces: ifaces,
                    items: data,
                    promise: this.promise(),
                    length: data.length
                };
            },
            promise: function() {
                if (deferred == null) {
                    return null;
                };
                return deferred.promise();
            }
        };
    };

})(jQuery, infrae);
