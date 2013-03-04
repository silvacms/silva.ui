
(function($, infrae) {

    /**
     * NotificationManager manage notifications
     * @param options: configuration options.
     */
    var NotificationManager = function(smi, options) {
        var $container = $(options.notifications.selector),
            defaults = {
                themeState: 'feedback',
                speed: options.notifications.speed === undefined && 'normal' || options.notifications.speed};

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
            },
            /**
             * When a page is open, display the corresponding
             * notifications.
             */
            page: function(data) {
                if (data.notifications != undefined) {
                    infrae.utils.each(data.notifications, api.notify);
                };
                return null;
            },
            /**
             * When an error happens, display the corresponding
             * notifications.
             */
            error: function(data) {
                if (data.notifications != undefined) {
                    infrae.utils.each(data.notifications, api.notify);
                };
                return null;
            }

        };

        // Support for webkit notificatons.
        if (!options.notifications.standard && window.webkitNotifications) {
            var native_api = window.webkitNotifications;

            var is_api_enabled = function(now) {
                var status = native_api.checkPermission();

                if (status == 0) {
                    // This is authorized
                    return true;
                } else if (status == 1) {
                    try {
                        // Hopyfully we will get it. Safari requires a callback.
                        native_api.requestPermission(function(){});
                        return now === true;
                    } catch (error) {
                        // Don't use native notifications.
                        return false;
                    };
                };
                return false;
            };

            if(is_api_enabled(true)) {
                $.extend(api, {
                    notify: function(message) {
                        if (is_api_enabled(false)) {
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
                            default_notify(message);
                        }
                    }
                });
            }
        };

        // Listen to pull notification events.
        $(document).bind('refresh-feedback-smi', function() {
            $.getJSON(options.notifications.url, function(messages) {
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

    $.extend(infrae.smi.plugins, {
        notifications: NotificationManager
    });


})(jQuery, infrae);
