
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
        var current = 288;

        var resize = function(position, minize) {
            if (minize === undefined) {
                if (position === undefined) {
                    // Restore to previous
                    position = current;
                    if (position === undefined) {
                        // We were minized, nothing to do.
                        return;
                    };
                };
                if (minized) {
                    // We need unminize.
                    $navigation.show();
                    minized = false;
                };
            };
            if (minize === true) {
                current = undefined;
            } else if (minize !== false) {
                current = position;
            };
            $navigation.css({width: position - 8});
            $workspace.css({left: position + 12});
            $(window).trigger('workspace-resize-smi');
        };
        var minize = function(save) {
            if (!minized) {
                $navigation.hide();
                minized = true;
            };
            resize(-8, save === true ? true : false);
        };
        var set_containment = function () {
            if ($handle.is(':visible')) {
                var width = $(window).width();
                var top = $handle.position().top;
                var current = $handle.position().left;
                var max_position = width - WORKSPACE_MIN_WIDTH;

                if (current > max_position) {
                    resize(max_position);
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
                if (position > NAVIGATION_MIN_WIDTH + 8) {
                    resize(position);
                    return null;
                };
                resize(NAVIGATION_MIN_WIDTH + 8);
                return true;
            };
            minize(true);
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
        $(window).bind('fullscreen-resize-smi', function(event, data) {
            if (data.active) {
                $handle.hide();
                minize();
            } else {
                resize();
                $handle.show();
            };
        });
    });
})(jQuery, infrae);

(function ($, infrae) {
    // Support for tipsy
    var TipManager = function(smi, options) {
        return {
            page: function(data) {
                // Clear existing tips when a page is open.
                $('.tipsy').hide();
                return null;
            }
        };
    };

    $.extend(infrae.smi.plugins, {
        tip: TipManager
    });

})(jQuery, infrae);

(function ($) {
    // Support for fullscreen mode

    $(document).ready(function() {
        var $fullscreen = $('#workspace .header .fullscreen');
        var $header = $('#workspace .header');
        var $content = $('#workspace .content');
        var active = false;

        $fullscreen.bind('click', function(event) {
            $fullscreen.toggleClass('active');
            $header.toggleClass('compact-header');
            $content.toggleClass('extended-content');
            active = !active;
            $(window).trigger('fullscreen-resize-smi', {active: active});
            event.stopPropagation();
            event.preventDefault();
        });
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
        $(document).on('mouseenter', 'a.ui-state-default', function() {
            var $context = $(this);

            if ($context.parents('.ui-dialog').length == 0) {
                $context.removeClass('ui-state-default');
                $context.addClass('ui-state-active');
            }
        });
        $(document).on('mouseleave', 'a.ui-state-active', function() {
            var $context = $(this);

            if ($context.parents('.ui-dialog').length == 0) {
            	$context.removeClass('ui-state-active');
            	$context.addClass('ui-state-default');
            }
        });
    });
})(jQuery);
