
(function($, infrae) {
    /**
     * Clipboard used for listing content.
     * @param notification: notification manage used to send notifications.
     */

    var ClipBoardManager = function(notifications) {
        var cutted_ids = [];
        var copied_ids = [];

        var clear = function() {
            var old_length = cutted_ids.length + copied_ids.length;

            api.cutted = [];
            cutted_ids = [];
            api.copied = [];
            copied_ids = [];
            return old_length != 0;
        };

        var api = {
            cutted: [],
            copied: [],
            /**
             * Update items that are stored in the clipboard. This is
               usefull if the items got renamed.
             */
            update: function(items) {
                var modified = false;

                $.each(items, function(i, item) {
                    var cutted_index = $.inArray(item.id, cutted_ids),
                        copied_index = $.inArray(item.id, copied_ids);

                    if (cutted_index > -1) {
                        api.cutted[cutted_index] = item;
                        modified = true;
                    };
                    if (copied_index > -1) {
                        api.copied[copied_index] = item;
                        modified = true;
                    };
                });
                if (modified) {
                    $('body').trigger('contentchange-smiclipboard');
                };
            },
            /**
             * Remove the given items from the clipboard. This is
               usefull if they have been deleted in the mean time.
             */
            remove: function(items) {
                var modified = false;

                $.each(items, function(i, item) {
                    var cutted_index = $.inArray(item, cutted_ids),
                        copied_index = $.inArray(item, copied_ids);

                    if (cutted_index > -1) {
                        cutted_ids.splice(cutted_index, 1);
                        api.cutted.splice(cutted_index, 1);
                        modified = true;
                    };
                    if (copied_index > -1) {
                        copied_ids.splice(copied_index, 1);
                        api.copied.splice(copied_index, 1);
                        modified = true;
                    };
                });
                if (modified) {
                    $('body').trigger('contentchange-smiclipboard');
                };
            },
            /**
             * Clear the clipboard.
             */
            clear: function(no_notification) {
                if (clear()) {
                    $('body').trigger('contentchange-smiclipboard');
                };
                if (!no_notification) {
                    notifications.notify({
                        message: 'Clipboard cleared.',
                        autoclose: 4000});
                };
            },
            /**
             * Store the given items as a cut in the clipboard.
             * @param items: Items to cut.
             */
            cut: function(items, no_notification) {
                var count = 0;

                clear();
                $.each(items, function(i, item) {
                    if ($.inArray(item.id, cutted_ids) < 0) {
                        cutted_ids.push(item.id);
                        api.cutted.push(item);
                        count += 1;
                    };
                });
                $('body').trigger('contentchange-smiclipboard');
                if (!no_notification) {
                    var message = {
                        message: 'Cut ' + count.toString() + ' item(s) in the clipboard.',
                        autoclose: 4000};
                    if (!count) {
                        message['category'] = 'error';
                    };
                    notifications.notify(message);
                };
            },
            /**
             * Store the given items as a copy in the clipboard.
             * @param items: Copied items.
             */
            copy: function(items, no_notification) {
                var count = 0;

                clear();
                $.each(items, function(i, item) {
                    if ($.inArray(item.id, copied_ids) < 0) {
                        copied_ids.push(item.id);
                        api.copied.push(item);
                        count += 1;
                    };
                });
                $('body').trigger('contentchange-smiclipboard');
                if (!no_notification) {
                    var message = {
                        message: 'Copied ' + count.toString() + ' item(s) in the clipboard.',
                        autoclose: 4000};
                    if (!count) {
                        message['category'] = 'error';
                    };
                    notifications.notify(message);
                };
            },
            /**
             * Return the size of the clipboard.
             */
            length: function() {
                return api.cutted.length + api.copied.length;
            }
        };
        return api;
    };

    infrae.smi.ClipBoardManager = ClipBoardManager;

})(jQuery, infrae);
