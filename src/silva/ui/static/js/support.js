
// Implement various support an FX details.

(function ($, infrae) {
    // Resize navigation - workspace support
    var NAVIGATION_MIN_WIDTH = 280;
    var WORKSPACE_MIN_WIDTH = 650;

    $(document).ready(function () {
        var $navigation = $('#navigation');
        var $workspace = $('#workspace');
        var $handle = $('#smi-handle');
        var minized = false;
        var timer = null;

        var set_size = function(position) {
            $navigation.css({width: position - 8});
            $workspace.css({left: position + 12});
            $(window).trigger('workspace-resize-smi');
        };

        var set_containment = function () {
            if ($handle.is(':visible')) {
                var width = $(window).width();
                var top = $handle.position().top;
                var current = $handle.position().left;
                var max_position = width - WORKSPACE_MIN_WIDTH;

                if (current > max_position) {
                    set_size(max_position);
                    $handle.css({left: max_position});
                };
                $handle.draggable(
                    'option',
                    'containment',
                    [8, top, max_position, top]);
            };
        };
        var resizer =  function() {
            var position = $handle.position().left;

            if (position > NAVIGATION_MIN_WIDTH / 2) {
                if (minized) {
                    $navigation.show();
                    minized = false;
                };
                if (position > NAVIGATION_MIN_WIDTH + 8) {
                    set_size(position);
                    return null;
                };
                set_size(NAVIGATION_MIN_WIDTH + 8);
                return true;
            };
            if (!minized) {
                $navigation.hide();
                minized = true;
                set_size(-8);
            };
            return false;
        };
        var finalizer = function() {
            var status = resizer();

            if (status === true) {
                $handle.css('left', NAVIGATION_MIN_WIDTH + 8);
            } else if (status === false) {
                $handle.css('left', -12);
            };
        };

        // Cover is used to cover the whole page, to prevent iframes
        // to catch events.
        var $cover = $('<div id="smi-cover">');
        $handle.draggable({
            axis: 'x',
            start: function(event, ui) {
                $('body').append($cover);
            },
            drag: function(event, ui) {
                resizer();
            },
            stop: function(event, ui) {
                $cover.detach();
                finalizer();
            }
        });
        set_containment();
        infrae.ui.selection.disable($handle);
        $(window).bind('resize', set_containment);
    });
})(jQuery, infrae);

(function ($) {
    // Add a loading message on server request
    $(document).ready(function () {
        var count = 0;
        var message = $('div#loading-message');

        if (message) {
            $('body').ajaxSend(function() {
                if (!count) {
                    message.fadeIn('fast');
                };
                count += 1;
            });
            $(document).ajaxComplete(function() {
                count -= 1;
                if (!count) {
                    message.fadeOut('fast');
                };
            });
        };
    });
})(jQuery);

(function ($) {
    // jQueryUI styling: this changes icon style on hover
    $(document).ready(function(){
        $('a.ui-state-default').live('mouseenter', function() {
            var context = $(this);
            context.removeClass('ui-state-default');
            context.addClass('ui-state-active');
        });
        $('a.ui-state-active').live('mouseleave', function() {
            var context = $(this);
            context.removeClass('ui-state-active');
            context.addClass('ui-state-default');
        });
    });
})(jQuery);
