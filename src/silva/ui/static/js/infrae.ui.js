
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
                }).bind('selectstart', function() {
                    return false;
                }).bind('mousedown', function() {
                    return false;
                });
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
         * Create a confirmation dialog that returns a promise.
         *
         * @param data: object defining the confirmation message.
         */
        ConfirmationDialog: function(data) {
            var deferred = $.Deferred();
            var message = $('<div></div>');
            var dialog = {modal: true, buttons: {}};

            if (data.title) {
                message.attr('title', data.title);
            };
            message.html(data.message);
            if (!data.buttons) {
                data.buttons = {
                    Ok: function() {
                        return true;
                    },
                    Cancel: function() {
                        return false;
                    }
                };
            };
            $.each(data.buttons, function(name, callback) {
                dialog.buttons[name] = function() {
                    callback() ? deferred.resolveWith(this) : deferred.rejectWith(this);
                };
            });
            message.dialog(dialog);
            deferred.always(function () {
                $(this).dialog('close');
            });
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
        updateTableColumnsWidths: function($table, options, reference) {
            if (typeof(options.fixed) != 'object') {
                options.fixed = {};
            };
            return $table.each(function() {
                var $table = $(this);
                var colComputedWidths = {};
                var fixedWidths = {};
                var totalWidth = 0;
                var newColWidth;

                $table.css("table-layout", "auto");
                if (reference !== undefined) {
                    var regex = /width: ([0-9]+)([pxem%]*)/;

                    reference.find('tr:visible:first').find('td, th').each(function(i) {
                        var match = $(this).attr('style').toLowerCase().match(regex);

                        colComputedWidths[i] = parseInt(match[1]);
                        fixedWidths[i] = match[2];
                    });
                } else {
                    $table.find('tr:visible:first').find('td').each(function(i) {
                        if (options.fixed[i]) {
                            colComputedWidths[i] = options.fixed[i];
                            fixedWidths[i] = 'px';
                        } else {
                            colComputedWidths[i] = $(this).outerWidth();
                        };
                        totalWidth += colComputedWidths[i];
                    });
                };

                $table.css("table-layout", "fixed");
                for (var i in colComputedWidths) {
                    if (fixedWidths[i]) {
                        newColWidth = colComputedWidths[i].toString() + fixedWidths[i];
                    } else {
                        newColWidth = Math.round(colComputedWidths[i] / totalWidth * 100) + '%';
                    };
                    $table.find("tr").each(function() {
                        $(this).children().eq(i).css("width", newColWidth);
                    });
                };
            });
        }
    });

    infrae.ui = module;
})(infrae, jQuery);
