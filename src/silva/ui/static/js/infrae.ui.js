
// UI

(function (infrae, $) {
    var module = {};
    var dialog_options = {maxFactor: 0.8,
                          minFactor: 0,
                          threshold: 15,
                          maxWidth: 0,
                          maxHeight: 0,
                          minWidth: 0,
                          maxHeight: 0,
                          position: ['center', 'center']};

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
                return $content.disableSelection();
            },
            /**
             * Enable previously disabled text selection.
             * @param $content: jQuery content on which the text selection must be reenabled.
             */
            enable: function($content) {
                return $content.enableSelection();
            }
        },
        /**
         * Manage the size of jQuery UI dialog.
         *
         * @param $dialog: object representing the dialog.
         */
        ShowDialog: function($dialog, options) {
            var $window = $(window);
            var $widget = $dialog.dialog('widget');

            if (options !== undefined) {
                for (var name in dialog_options){
                    if (options[name] === undefined) {
                        // We don't use extend because we want to be
                        // able to dynamically update values.
                        options[name] = dialog_options[name];
                    };
                };
            } else {
                options = dialog_options;
            };

            var resize = function(initial) {
                var window_width = $window.width();
                var window_height = $window.height();
                var widget_width = $widget.width();
                var widget_height = $widget.height();
                var min_width = Math.ceil(window_width * options.minFactor);
                var min_height = Math.ceil(window_height * options.minFactor);
                var max_width = Math.ceil(window_width * options.maxFactor);
                var max_height = Math.ceil(window_height * options.maxFactor);
                var popup_position = $widget.position();
                var need_reposition = (initial === true);
                var changed_size = false;

                if (options.maxWidth) {
                    max_width = Math.min(options.maxWidth, max_width);
                };
                if (options.maxHeight) {
                    max_height = Math.min(options.maxHeight, max_height);
                };
                if (options.minWidth) {
                    min_width = Math.max(options.minWidth, min_width);
                };
                if (options.minHeight) {
                    min_height = Math.max(options.minHeight, min_height);
                };
                if (widget_height < min_height) {
                    $dialog.dialog('option', 'height', min_height);
                    widget_height = min_height;
                    changed_size = true;
                    if (max_height < min_height) {
                        max_height = min_height;
                    };
                } else if (widget_height > max_height) {
                    $dialog.dialog('option', 'height', max_height);
                    widget_height = max_height;
                    changed_size = true;
                };
                if (popup_position.top) {
                    if (window_height - (popup_position.top + widget_height + options.threshold) < 0) {
                        need_reposition = true;
                    };
                };
                if (widget_width < min_width) {
                    $dialog.dialog('option', 'width', min_width);
                    widget_width = min_width;
                    changed_size = true;
                    if (max_width < min_width) {
                        max_width = min_width;
                    };
                } else if (widget_width > max_width) {
                    $dialog.dialog('option', 'width', max_width);
                    widget_width = max_width;
                    changed_size = true;
                };
                if (popup_position.left) {
                    if (window_width - (popup_position.left + widget_width + options.threshold) < 0) {
                        need_reposition = true;
                    };
                };
                $dialog.dialog('option', 'maxHeight', max_height);
                $dialog.dialog('option', 'maxWidth', max_width);
                $dialog.dialog('option', 'minHeight', min_height);
                $dialog.dialog('option', 'minWidth', min_width);
                if (need_reposition) {
                    $dialog.dialog('option', 'position', options.position);
                };
                if (changed_size) {
                    $dialog.trigger(
                        'infrae-ui-dialog-resized',
                        {height: widget_height, width: widget_width});
                };
            };

            var handler = function(event) {
                if (event.target === window) {
                    // We are only interrested about real window resize events.
                    setTimeout(resize, 0);
                } else if (event.target === $widget.get(0)) {
                    $dialog.trigger(
                        'infrae-ui-dialog-resized',
                        {height: $widget.height(), width: $widget.width()});
                };
            };

            $window.bind('resize.infrae-ui-dialog', handler);
            $dialog.one('dialogclose', function () {
                $window.unbind('resize.infrae-ui-dialog', handler);
                $dialog.unbind('infrae-ui-dialog-resize');
            });
            $dialog.bind('infrae-ui-dialog-resize', function () {
                resize();
            });
            $dialog.dialog('open');
            resize(true);
        },
        ResizeDialog: function($dialog) {
            if ($dialog.dialog('isOpen')) {
                $dialog.trigger('infrae-ui-dialog-resize');
            }
        },
        /**
         * Create a confirmation dialog that returns a promise.
         *
         * @param data: object defining the confirmation message.
         */
        ConfirmationDialog: function(data) {
            var deferred = $.Deferred();
            var $message = $('<div></div>');
            var configuration = {autoOpen: false, modal: true, buttons: {}, zIndex: 12000};

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
                    if (result.then  !== undefined) {
                        result.then(deferred.resolve, deferred.reject);
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
        update_table_columns: function($table, options, $reference) {
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
