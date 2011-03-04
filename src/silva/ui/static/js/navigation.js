(function($) {
    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMINavigation = function(smi, options) {
        var navigation = this;
        var tree = navigation.children('.tree');
        var url = new jsontemplate.Template(options.url, {});
        var parents_url = new jsontemplate.Template(options.parents_url, {});
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

        var uncollapse = function(parents) {
            var last = parents.length - 1;

            function open_node(remaining) {
                var parent_node = $("#" + remaining[0]);
                var left = remaining.slice(1);
                if (parent_node.length) {
                    if (left.length) {
                        tree.jstree(
                            'open_node',
                            parent_node,
                            function(){ open_node(left); });
                    } else {
                        tree.jstree('select_node', parent_node, true);
                    }
                }
            };
            open_node(parents);
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
        navigation.bind('blur-smi', function() {
            tree.jstree("disable_hotkeys");
        });
        navigation.bind('focus-smi', function() {
            tree.jstree("enable_hotkeys");
        });

        // Open view on click
        $(options.selector + ' .tree a').live('click', function(event) {
            smi.open_screen($(this).parent().data('jstree').path);

            return false;
        });

        // If a content is selected, try to select its container
        navigation.bind('content-smi', function (event, data) {
            uncollapse(data.navigation.parents);
        });
    };
})(jQuery);
