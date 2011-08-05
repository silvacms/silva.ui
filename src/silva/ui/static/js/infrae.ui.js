
// UI

(function (infrae, $) {
    var module = {};

    $.extend(module, {
        /**
         * Render an icon, either from a sprite or a file.
         * @param $content: jQuery content on which the icon must be rendered.
         * @param icon: icon identifier.
         */
        icon: function($content, icon) {
            if (icon.indexOf('.') < 0) {
                $content.addClass(icon);
            } else {
                $content.attr(
                    'style',
                    'background:url(' + icon + ') no-repeat center center;');
            };
        },
        selection: {
            /**
             * Disable text based selection.
             * @param $content: jQuery content on which the text selection must be disabled.
             */
            disable: function($content) {
                return $content.css({
                    '-moz-user-select': 'none',
                    '-webkit-user-select': 'none',
                    'user-select': 'none'
                }).bind('selectstart', false).bind('mousedown', false);
            },
            /**
             * Enable previously disabled text selection.
             * @param $content: jQuery content on which the text selection must be reenabled.
             */
            enable: function($content) {
                return $content.css({
                    '-moz-user-select': 'text',
                    '-webkit-user-select': 'text',
                    'user-select': 'text'
                }).unbind('selectstart').unbind('mousedown');
            }
        },
        /**
         * Manage the size of jQuery UI dialog.
         *
         * @param $dialog: object representing the dialog.
         */
        ShowDialog: function($dialog) {
            var $window = $(window);
            var $widget = $dialog.dialog('widget');
            var max_width = Math.ceil($window.width() * 0.8);
            var max_height = Math.ceil($window.height() * 0.8);

            if ($widget.height() > max_height) {
                $dialog.dialog('option', 'height', max_height);
            };
            if ($widget.width() > max_width) {
                $dialog.dialog('option', 'width', max_width);
            };
            $dialog.dialog('option', 'maxHeight', max_height);
            $dialog.dialog('option', 'maxWidth', max_width);
            $dialog.dialog('open');
        },
        /**
         * Create a confirmation dialog that returns a promise.
         *
         * @param data: object defining the confirmation message.
         */
        ConfirmationDialog: function(data) {
            var deferred = $.Deferred();
            var $message = $('<div></div>');
            var configuration = {autoOpen: false, modal: true, buttons: {}};

            if (data.title) {
                $message.attr('title', data.title);
            };
            $message.html(data.message);
            if (!data.buttons) {
                data.buttons = {
                    Cancel: function() {
                        return false;
                    },
                    Continue: function() {
                        return true;
                    }
                };
                if (data.not_cancellable) {
                    delete data.buttons['Cancel'];
                };
            };
            $.each(data.buttons, function(name, callback) {
                configuration.buttons[name] = function() {
                    var result = callback();
                    if (result.pipe != undefined) {
                        result.pipe(deferred.resolve, deferred.reject);
                    } else {
                        result ? deferred.resolve() : deferred.reject();
                    }
                };
            });
            // This event is triggered when the dialog is closed,
            // either by an action or the top level close button.
            $message.bind('dialogclose', function() {
                $message.remove();
                // In case where the dialog was not triggered by a
                // button we reject the deferred. It will only reject
                // it if it was not previously rejected or resolved.
                deferred.reject();
            });
            deferred.always(function () {
                $message.dialog('close');
            });
            $message.dialog(configuration);
            infrae.ui.ShowDialog($message);
            return deferred.promise();
        },
        /**
         * Smoothly scroll an element vertically, snapping to an interval size
         *
         * @param speed: Animation speed in ms, or one of the jQuery speed string values
         * @param direction: 'up' or 'down'
         * @param distance: Distance to scroll in pixels
         * @param interval: Size in pixels to round the scrolling off to
         */
        scroll: function($content, speed, direction, distance, interval) {
            var position = $content.scrollTop();
            var target;

            switch (direction) {
            case 'up':
                target = position - distance;
                if (interval) {
                    target -= target % interval;
                };
                break;
            case 'down':
                target = position + distance;
                if (interval && position % interval != 0) {
                    target += interval - (target % interval);
                };
                break;
            case 'absolute':
            default:
                target = distance;
            };

            $content.stop(true, true);
            $content.animate({scrollTop: target}, speed);
            return $content.promise();
        },
        /**
         * Calculate and set percentual widths on table columns based on the
         * automatically determined width of columns. In other words: let the
         * browser set the size of the columns based on contents, and then
         * fix those proportions so they remain when resizing the window.
         * In case a 'source' is specified the column sizes from that object
         * are copied, assuming the source is also a table.
         *
         * @param options: Object which can contain a 'source' jQuery object or a
         * 'fixedColumns' object containing columnindex:pixelwidth values
         */
        updateTableColumnsWidths: function($table, options, $reference) {
            if (typeof(options.fixed) != 'object') {
                options.fixed = {};
            };
            return $table.each(function() {
                var $table = $(this);
                var colComputedWidths = {};
                var fixedWidths = {};
                var totalWidth = 0;

                if ($reference !== undefined) {
                    var regex = /([0-9]+)([em%]*)/;

                    $reference.find("colgroup col").each(function(i) {
                        var match = $(this).attr('width').match(regex);

                        if (match) {
                            colComputedWidths[i] = match[1];
                            fixedWidths[i] = match[2];
                        };
                    });
                } else {
                    $table.css("table-layout", "auto");
                    $table.find("tr:visible:first td").each(function(i) {
                        if (options.fixed[i]) {
                            colComputedWidths[i] = options.fixed[i];
                            fixedWidths[i] = null;
                        } else {
                            colComputedWidths[i] = $(this).outerWidth();
                        };
                        totalWidth += colComputedWidths[i];
                    });
                };

                $table.css("table-layout", "fixed");
                $table.find('colgroup col').each(function (i) {
                    var newColWidth;

                    if (fixedWidths[i] !== undefined) {
                        newColWidth = colComputedWidths[i];
                        if (fixedWidths[i])
                            newColWidth += fixedWidths[i];
                    } else {
                        newColWidth = Math.round(colComputedWidths[i] / totalWidth * 100) + '%';
                    };
                    $(this).attr("width", newColWidth);
                });
            });
        }
    });

    infrae.ui = module;
})(infrae, jQuery);
