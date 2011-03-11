(function($) {

    // First next elemeent that doesn't match the descriptor.
    $.fn.nextOne = function(selector) {
        var element = $(this);
        var not_matching = element.nextUntil(selector);

        if (not_matching.length) {
            return not_matching.last().next();
        };
        return element.next();
    };

    /**
     * Disable or enable text selection
     */
    $.fn.disableTextSelect = function() {
        return this.each(function() {
            $(this).css({
                '-moz-user-select': 'none',
                '-webkit-user-select': 'none',
                'user-select': 'none'
            }).bind('selectstart', function() {
                return false;
            }).bind('mousedown', function() {
                return false;
            });
        });
    };
    $.fn.enableTextSelect = function() {
        return this.each(function() {
            $(this).css({
                '-moz-user-select': 'text',
                '-webkit-user-select': 'text',
                'user-select': 'text'
            }).unbind('selectstart').unbind('mousedown');
        });
    };

    /**
     * Smoothly scroll an element vertically, snapping to an interval size
     *
     * @param speed: Animation speed in ms, or one of the jQuery speed string values
     * @param direction: 'up', 'down', 'left' or 'right'
     * @param distance: Distance to scroll in pixels
     * @param interval: Size in pixels to round the scrolling off to
     */
    $.fn.smartScroll = function(speed, direction, distance, interval) {
        var curpos;
        var newpos;
        return $(this).each(function() {
            if (!$(this).data('smartScroll_active')) {
                $(this).data('smartScroll_active', true);
                if (direction == 'up' || direction == 'down') {
                    curpos = $(this).scrollTop();
                    if (direction == 'up') {
                        newpos = curpos - distance;
                        if (interval) {
                            newpos -= newpos % interval;
                        }
                    } else {
                        newpos = curpos + distance;
                        if (interval && newpos % interval != 0) {
                            newpos += interval - (newpos % interval);
                        }
                    }
                    $(this).animate({scrollTop: newpos}, speed, function() {
                        $(this).data('smartScroll_active', false);
                    });
                } else {
                    curpos = $(this).scrollLeft();
                    if (direction == 'left') {
                        newpos = curpos - distance;
                        if (interval) {
                            newpos -= newpos % interval;
                        }
                    } else {
                        newpos = curpos + distance;
                        if (interval && newpos % interval != 0) {
                            newpos += interval - (newpos % interval);
                        }
                    }
                    $(this).animate({scrollLeft: newpos}, speed, function() {
                        $(this).data('smartScroll_active', false);
                    });
                }
            }
        });
    };

    /**
     * Set a class name to table rows based on a sequence.
     *
     * @param classes: List of class names in the sequence. Defaults to ['odd', 'even']
     */
    $.fn.setClassSequence = function(classes) {
        return $(this).each(function() {
            if (typeof(classes) != 'object') {
                classes = ['odd', 'even'];
            }
            var length = classes.length;
            $(this).find('tr').removeClass(classes.join(' ')).each(function(i) {
                $(this).addClass(classes[i % length]);
            });
        });
    };

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
    $.fn.updateTableColumnsWidths = function(options, reference) {
        return this.each(function() {
            var colComputedWidths = {};
            var colWidths = {};
            var colOuterWidths = {};
            var fixedWidths = {};
            var totalWidth = 0;

            $(this).css("table-layout", "auto");
            if (typeof(options.fixed) != 'object') {
                options.fixed = {};
            }
            if (reference !== undefined) {
                var regex = /width: ([0-9]+)([pxem%]*)/;
                var minus = 0;

                reference.find('tr:first').find('td, th').each(function(i) {
                    var match = $(this).attr('style').toLowerCase().match(regex);
                    var width = parseInt(match[1]);
                    var fixed = match[2];

                    colWidths[i] = width;
                    colOuterWidths[i] = $(this).outerWidth();
                    if (options.skip &&
                        options.skip[i] &&
                        i - minus &&
                        fixedWidths[i - (minus + 1)] == fixed) {
                        minus += 1;
                        colComputedWidths[i - minus] +=
                           colOuterWidths[i - 1] - colWidths[i - 1] + width;
                    } else {
                        colComputedWidths[i - minus] = width;
                        fixedWidths[i - minus] = fixed;
                    };
                });
            } else {
                $(this).find('tr:first').find('td').each(function(i) {
                    if (options.fixed[i]) {
                        colComputedWidths[i] = options.fixed[i];
                        totalWidth += options.fixed[i];
                        fixedWidths[i] = 'px';
                    } else {
                        colComputedWidths[i] = $(this).outerWidth();
                        totalWidth += $(this).outerWidth();
                    }
                });
            }
            var newColWidth;
            for (var i in colComputedWidths) {
                if (fixedWidths[i]) {
                    newColWidth = colComputedWidths[i].toString() + fixedWidths[i];
                } else {
                    newColWidth = Math.round(colComputedWidths[i] / totalWidth * 100) + '%';
                }
                $(this).css("table-layout", "fixed");
                $(this).find("tr").each(function() {
                    $(this).children().eq(i).css("width", newColWidth);
                });
            }
        });
    };

})(jQuery);
