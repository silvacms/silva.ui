(function($) {
    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMINavigation = function(smi, options) {
        var navigation = this;
        var tree = navigation.children('.tree');
        var url = new jsontemplate.Template(options.url, {});

        /**
         * Scroll the tree container horizontally to allow for unlimited node depth.
         */
        var scroll = function(node, depth) {
            return node.each(function() {
                if(depth < 0) {
                    depth = 0;
                }
                tree.scrollLeft(21 * depth);
            });
        };

        // Disable text selection on tree
        tree.disableTextSelect();

        // Load the tree.
        tree.jstree({
            ui: {
                select_limit: 1
            },
            core: {
                animation: 100
            },
            plugins: ["json_data", "ui", "hotkeys"],
            json_data: {
                ajax: {
                    url: function (node) {
                        if (node == -1) {
                            return url.expand({path: ''});
                        };
                        return url.expand({path: node.data('jstree').path});
                    }
                }
            }
        });

        // Bind JStree event to set the autoscroll.
        tree.bind("open_node.jstree", function(event, data) {
            scroll($(this), data.rslt.obj.parents('ul').length - 2);
        });
        tree.bind("close_node.jstree", function(event, data) {
            scroll($(this), data.rslt.obj.parents('ul').length - 3);
        });

        // Listen to smi.blur and focus to activate/disable shortcuts.
        navigation.bind('blur.smi', function() {
            var keybinds = $.extend(true, {}, $('body').SMI('getbinds'));

            tree.data('keybinds', keybinds);
            $.each(keybinds, function(key) {
                $('body').SMI('unbind', key);
            });
            tree.jstree("disable_hotkeys");
            navigation.removeClass("focus");
        });
        navigation.bind('focus.smi', function() {
            var keybinds = $('#tree').data('keybinds');

            if (keybinds) {
                $.each(keybinds, function(key, fn) {
                    $('body').SMI('keybind', key, fn);
                });
            }
            tree.jstree("enable_hotkeys");
            navigation.addClass('focus');
        });

        // Open view on click
        $(options.selector + ' .tree a').live('click', function(event) {
            smi.open($(this).parent().data('jstree').path);

            return false;
        });

        // Bind clik on view structure back to root
        navigation.children('h2').bind('click', function(event) {
            smi.open('/');
        });

        // If a content is selected, try to select its container
        navigation.bind('content.smi', function (event, data) {
            var node = $('#' + data.navigation);

            if (node.length) {
                tree.jstree('select_node', node, true);
            };
        });


    };
})(jQuery);
