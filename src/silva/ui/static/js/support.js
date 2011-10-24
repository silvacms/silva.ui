
// Implement various support an FX details.

(function ($) {
    // Resize navigation - workspace support
    var NAVIGATION_MIN_WIDTH = 300;
    var WORKSPACE_MIN_WIDTH = 650;

    $(document).ready(function () {
        var $navigation = $('#navigation');
        var $workspace = $('#workspace');
        var $handle = $('#handle');
        var min_position = NAVIGATION_MIN_WIDTH + 8;

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
                    [min_position, top, max_position, top]);
            };
        };
        var resizer =  function(event, ui) {
            set_size($handle.position().left);
        };

        $handle.draggable({
            axis: 'x',
            iframeFix: true,
            drag: resizer,
            stop: resizer
        });
        set_containment();
        $(window).bind('resize', set_containment);
    });
})(jQuery);

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
