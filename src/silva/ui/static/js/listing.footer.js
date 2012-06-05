
(function($, infrae) {

    // Display a element in the clipboard
    infrae.views.view({
        iface: 'content',
        name: 'clipboarditem.smilisting',
        factory: function($content, data, state) {
            return {
                render: function() {
                    var $item = $('<li class="clipboard-item '+ state + '"></li>');

                    if (data.title) {
                        if (data.path) {
                            var $link = $('<a class="open-screen"></a>');

                            $link.attr('href', data.path);
                            $link.text(data.title);
                            $item.append($link);
                        } else {
                            $item.text(data.title);
                        };
                    };
                    if (data.icon) {
                        var $icon = $('<ins class="icon"></icon>');
                        infrae.ui.icon($icon, data.icon);
                        $item.prepend($icon);
                    };

                    $content.append($item);
                }
            };
        }
    });

    /**
     * Render clipboard data view.
     */
    var render_clipboard = function($info, smi) {
        var $popup = $info.children('.clipboard-content');
        var $detail = $info.children('a');
        var $icon = $detail.children('ins');
        var $count = $detail.children('.count');
        var is_uptodate = false;

        var update = function() {
            $popup.empty();
            $.each(smi.clipboard.cutted, function(i, item) {
                $popup.render({
                    data: item,
                    name: 'clipboarditem.smilisting',
                    args: ['cutted']});
            });
            $.each(smi.clipboard.copied, function(i, item) {
                $popup.render({
                    data: item,
                    name: 'clipboarditem.smilisting',
                    args: ['copied']});
            });
            is_uptodate = true;
        };

        var onchange = function() {
            var length = smi.clipboard.length();

            $count.text(length.toString());
            if ($popup.is(':visible')) {
                update();
            } else {
                is_uptodate = false;
            };
            if (length) {
                $icon.show();
            } else {
                $icon.hide();
            };
        };

        // Set default clipboard count on creation
        onchange();
        // Update count when clipboard is changed
        $('body').bind('contentchange-smiclipboard', onchange);

        var toggle = function() {
            var is_visible = $popup.is(':visible');
            var is_unfoldable = $icon.is(':visible');

            if (!is_uptodate && !is_visible) {
                update();
            };
            if (is_visible || is_unfoldable) {
                $popup.fadeToggle();
            };
        };

        // Show actions when you click on the info, hide it when you leave.
        $detail.bind('click', function() {
            toggle();
            return false;
        });
        $popup.bind('mouseleave', function() {
            $popup.fadeOut();
        });
    };

    /**
     * Render counter information.
     */
    var render_counters = function($counters, listing) {
        listing.events.content(function () {
            for (var name in this) {
                var $counter = $counters.find('.' + name + ' .count');
                $counter.text(this[name].toString());
            };
        });
    };

    infrae.views.view({
        iface: 'listing',
        name: 'footer',
        factory: function($content, data, smi, listing) {
            return {
                render: function() {
                    // Disable text selection in all footer
                    infrae.ui.selection.disable($content);

                    // Render clipboard info
                    render_clipboard($content.find('.clipboard-info'), smi);

                    // Render counter information
                    render_counters($content.find('.counters'), listing);

                    // Remove loading message, display tools
                    $content.children('.listing-footer-loading').hide();
                    $content.children('.listing-footer-content').show();
                }
            };
        }
    });

})(jQuery, infrae);
