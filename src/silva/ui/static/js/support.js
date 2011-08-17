
// Implement various support an FX details.

(function ($) {
    // Resize navigation - workspace support
    var NAVIGATION_MIN_WIDTH = 300;
    var WORKSPACE_MIN_WIDTH = 650;

    $(document).ready(function () {
        var $navigation = $('#navigation');
        var $workspace = $('#workspace');
        var $handle = $('#handle');

        var set_containment = function () {
            var width = $(window).width();
            var top = $handle.position().top;
            $handle.draggable(
                'option',
                'containment',
                [NAVIGATION_MIN_WIDTH + 8, top, width - WORKSPACE_MIN_WIDTH, top]);
        };
        var resizer =  function(event, ui) {
            var position = $handle.position().left;
            $navigation.css({width: position - 8});
            $workspace.css({left: position + 12});
            $(window).trigger('workspace-resize-smi');
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
