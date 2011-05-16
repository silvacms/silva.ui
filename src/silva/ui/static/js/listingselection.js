
(function($, infrae) {

    $.fn.SMISelection = function() {
        var selection = infrae.deferred.FluxCapacitor();
        var collecting = false;
        var collection = infrae.deferred.FluxCapacitor();

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
        collection.events.incoming(function() {
            $(this).data('smilisting-line').input(['identifier', 'title']);
        });
        collection.events.outgoing(function() {
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
            /**
             * Return data associated to selected items.
             */
            data: function() {
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
                    items: data,
                    length: data.length,
                    input: {
                        is_running: function() {
                            return collecting;
                        },
                        finish: function() {
                            var values = collection.map(function() {
                                return $(this).data('smilisting-line').values(['identifier', 'title']);
                            });
                            selection.events.pop();
                            collection.clear();
                            collecting = false;
                            return values;
                        },
                        begin: function() {
                            if (!collecting) {
                                collecting = true;
                                selection.events.push();
                                selection.events.incoming(function() {
                                    collection.add(this);
                                });
                                selection.events.failing(
                                    selection.events.outgoing(function(){
                                        collection.remove(this, true);
                                    })
                                );
                                selection.events.outgoing(function() {
                                    $(this).data('smilisting-line').update();
                                });
                            }
                        }
                    }
                };
            }
        };
    };

})(jQuery, infrae);
