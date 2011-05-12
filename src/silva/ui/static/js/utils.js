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
     * @param direction: 'up' or 'down'
     * @param distance: Distance to scroll in pixels
     * @param interval: Size in pixels to round the scrolling off to
     */
    $.fn.SMISmoothScroll = function(speed, direction, distance, interval) {
        return $(this).each(function() {
            var element = $(this);
            var position = element.scrollTop();
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

            element.stop(true, true);
            element.animate({scrollTop: target}, speed);
        });
    };


})(jQuery);
