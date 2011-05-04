
(function($, obviel) {

    // Display a element in the clipboard
    obviel.view({
        iface: 'content',
        name: 'clipboarditem.smilisting',
        render: function() {
            var $item = $('<li class="clipboard-item '+ this.state + '"></li>');

            if (this.data.title) {
                if (this.data.path) {
                    var $link = $('<a class="open-screen"></a>');

                    $link.attr('href', this.data.path);
                    $link.text(this.data.title);
                    $item.append($link);
                } else {
                    $item.text(this.data.title);
                };
            };
            if (this.data.icon) {
                var $icon = $('<ins class="icon"></icon>');

                if (this.data.icon.indexOf('.') < 0) {
                    $icon.addClass(this.data.icon);
                } else {
                    $icon.attr(
                        'style',
                        'background:url(' + this.data.icon + ') no-repeat center center;');
                };
                $item.prepend($icon);
            };

            this.$content.append($item);
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
                    extra: {state: 'cutted'}});
            });
            $.each(smi.clipboard.copied, function(i, item) {
                $popup.render({
                    data: item,
                    name: 'clipboarditem.smilisting',
                    extra: {state: 'copied'}});
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
        for (var name in listing.by_name) {
            var $content = listing.by_name[name];
            var $counter = $counters.find('.' + name + ' .count');

            // Set default value.
            $counter.text($content.children('tr.item').length.toString());

            // Change in content change.
            $content.bind('contentchange-smilisting', function(event, data) {
                $counter.text(data.total.toString());
            });
        };
    };

    obviel.view({
        iface: 'listing',
        name: 'footer',
        render: function($content, data) {
            var listing = this.view;

            // Disable text selection in all footer
            $content.disableTextSelect();

            // Render clipboard info
            this.smi.clipboard.content = data.content;
            render_clipboard($content.find('.clipboard-info'), this.smi);

            // Render counter information
            render_counters($content.find('.counters'), listing);

        },
        cleanup: function() {
            this.smi.clipboard.content = null;
        }
    });

})(jQuery, obviel);
