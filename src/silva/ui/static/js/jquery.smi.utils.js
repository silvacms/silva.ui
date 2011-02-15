(function($) {
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
            }).mousedown(function() {
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
            }).unbind('selectstart').mousedown(function() {
                return true;
            });
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

    $.fn.findState = function(source, find) {
        var total = $(this).find(source).length;
        var found = $(this).find(find).length;
        if (found == 0) {
            return 'none';
        } else if (found == total) {
            return (found == 1) ? 'all single' : 'all';
        } else if (found == 1) {
            return 'partial single';
        } else {
            return 'partial';
        }
    };

    $.fn.array_match = function(one, two) {
        for (var i in one) {
            for (var j in two) {
                if (one[i] == two[j]) {
                    return one[i];
                }
            }
        }
        return false;
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
     * Set a class to each cell in one or more columns
     *
     * @param cols: Column number or list of numbers, zero-indexed
     * @param classname: The class name to set
     */
    $.fn.setColumnClass = function(cols, classname) {
        return this.each(function() {
            if (typeof(cols) != 'object') {
                cols = [cols];
            }
            $(this).find("tr").each(function() {
                for (var i in cols) {
                    $(this).find('th, td').eq(i).addClass(classname);
                }
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
    $.fn.updateTableColumnsWidths = function(options) {
        return this.each(function() {
            var colComputedWidths = {};
            var colWidths = {};
            var colOuterWidths = {};
            var fixedWidths = {};
            var totalWidth = 0;

            $(this).css("table-layout", "auto");
            if (typeof(options.fixedColumns) != 'object') {
                options.fixedColumns = {};
            }
            if (options.source) {
                var regex = /width: ([0-9]+)([pxem%]*)/;
                var minus = 0;

                $(options.source).find('tr:first').find('td, th').each(function(i) {
                    var stylematch = $(this).attr('style').toLowerCase().match(regex);
                    var width = parseInt(stylematch[1]);
                    var fixed = stylematch[2];

                    colWidths[i] = width;
                    colOuterWidths[i] = $(this).outerWidth();
                    if (options.skipColumns &&
                        options.skipColumns[i] &&
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
                    if (options.fixedColumns[i]) {
                        colComputedWidths[i] = options.fixedColumns[i];
                        totalWidth += options.fixedColumns[i];
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

    $.fn.rangeFilter = function(elem, start, end) {
        if (typeof(start) == 'object') {
            return $(this).find(elem).filter(function(i) {
                return ($.inArray(i, start) != -1);
            });
        } else if (end != null) {
            return $(this).find(elem).slice(start, end);
        } else {
            return $(this).find(elem).slice(start);
        }
    };

    $.fn.getCell = function(column, row) {
        if (row) {
            return $(this).rangeFilter('tr', [row]).rangeFilter('td, th', [column]);
        } else {
            return $(this).rangeFilter('td, th', [column]);
        }
    };
})(jQuery);
