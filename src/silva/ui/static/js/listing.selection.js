
(function($, infrae) {

    var Selection = function(configuration) {
        var selection = infrae.deferred.FluxCapacitor();
        var renaming = null;
        var renames = infrae.deferred.FluxCapacitor();

        // Default behavior of a SMI Selection.
        selection.events.incoming(function() {
            $(this).addClass('selected');
        });
        selection.events.outgoing(function() {
            $(this).removeClass('selected');
        });
        selection.events.failing(function() {
            $(this).remove();
        });

        // To collect values from lines.
        renames.events.incoming(function() {
            $(this).data('smilisting-line').rename();
        });
        renames.events.outgoing(function() {
            $(this).data('smilisting-line').update();
        });


        return {
            /**
             * Select a set of $items.
             */
            select: function($items) {
                var changed = false;

                if ($items.length) {
                    $items.each(function () {changed |= selection.add(this);});
                };
                return changed;
            },
            /**
             * Unselect a set of $items.
             */
            unselect: function($items) {
                var changed = false;

                $items.each(function () { changed |= selection.remove(this);});
                return changed;
            },
            /**
             * Remove a set of $items (so they are unselected).
             */
            remove: function($items) {
                var changed = false;

                $items.each(function () { changed |= selection.remove(this, true);});
                return changed;
            },
            /**
             * Toggle the selection for a set of $items.
             */
            toggle: function($items) {
                var changed = false;

                $items.each(function () {
                    if ($(this).hasClass('selected')) {
                        changed |= selection.remove(this);
                    } else {
                        changed |= selection.add(this);
                    };
                });
                return changed;
            },
            rename: function(deferred) {
                if (renaming === null) {
                    renaming = deferred;
                    selection.events.push();
                    selection.events.incoming(function() {
                        renames.add(this);
                    });
                    selection.events.failing(
                        selection.events.outgoing(function(){
                            renames.remove(this, true);
                        })
                    );
                    selection.events.outgoing(function() {
                        $(this).data('smilisting-line').update();
                    });
                    return true;
                };
                return false;
            },
            collect: function(success) {
                if (renaming !== null) {
                    var promise = renaming.promise();
                    if (success) {
                        var values = renames.map(function() {
                            return $(this).data('smilisting-line').values(['identifier', 'title']);
                        });
                        selection.events.pop();
                        renames.clear();
                        renaming.resolve(values);
                    } else {
                        selection.events.pop();
                        renames.clear(false);
                        renaming.reject();
                    };
                    renaming = null;
                    return promise;
                };
                return null;
            },
            /**
             * Return data associated to selected items.
             */
            status: function() {
                var ifaces = [];
                var data = [];

                selection.each(function () {
                    var $item = $(this);
                    if (!$item.is(':visible'))
                        return;

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
                    selection: {
                        length: data.length,
                        items: data
                    },
                    input: {
                        status: renaming != null
                    }
                };
            }
        };
    };

    infrae.smi.listing.Selection = Selection;

})(jQuery, infrae);
