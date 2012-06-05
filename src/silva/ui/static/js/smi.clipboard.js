
(function($, infrae) {


    /**
     * Clipboard used for listing content.
     * @param notification: notification manage used to send notifications.
     */
    var ClipBoardManager = function(notifications) {
        var cutted_ids = [];
        var copied_ids = [];

        var clear = function() {
            api.cutted = [];
            cutted_ids = [];
            api.copied = [];
            copied_ids = [];
        };

        var api = {
            cutted: [],
            copied: [],
            /**
             * Clear the clipboard.
             */
            clear: function(no_notification) {
                clear();
                $('body').trigger('contentchange-smiclipboard');
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
