
(function($, infrae) {

    /**
     * NotificationManager manage notifications
     * @param options: configuration options.
     */
    var NotificationManager = function(options) {
        var $container = $(options.selector),
            defaults = {
                themeState: 'feedback',
                speed: options.speed === undefined && 'normal' || options.speed};

        // Default jGrowl notifications
        var default_notify = function(message) {
            var options = $.extend({}, defaults);
            if (message.category == 'error') {
                options['themeState'] = 'error';
            };
            $.jGrowl(message.message, options);
        };

        $('#jGrowl').live('click', function(event) {
            $(this).jGrowl('close');
            event.stopPropagation();
            event.preventDefault();
        });

        var api = {
            /**
             * Notify of a new notification
             * @param message: message.
             */
            notify: default_notify,
            /**
             * Notify a list of new notifications
             * @param messages: list of messages.
             */
            notifies: function(messages) {
                infrae.utils.each(messages, api.notify);
            }
        };

        // Support for webkit notificatons.
        if (!options.standard && window.webkitNotifications) {
            var native_api = window.webkitNotifications;

            $.extend(api, {
                notify: function(message) {
                    var status = native_api.checkPermission();

                    if (status == 0) {
                        var notification = native_api.createNotification('', message.message, '');
                        if (message.autoclose) {
                            notification.ondisplay = function () {
                                setTimeout(function() {
                                    notification.cancel();
                                }, message.autoclose);
                            };
                        };
                        notification.show();
                    } else {
                        if (status == 1) {
                            native_api.requestPermission();
                        };
                        default_notify(message);
                    }
                }
            });
        };

        // Listen to pull notification events.
        $(document).bind('refresh-feedback-smi', function() {
            $.getJSON(options.url, function(messages) {
                if (messages.notifications) {
                    api.notifies(messages.notifications);
                };
            });
        });
        // Display a notification
        $(document).bind('notify-feedback-smi', function(event, data) {
            if (typeof(data) == "array") {
                api.notifies(data);
            } else {
                api.notify(data);
            };
        });
        return api;
    };

    infrae.smi.NotificationManager = NotificationManager;

})(jQuery, infrae);
