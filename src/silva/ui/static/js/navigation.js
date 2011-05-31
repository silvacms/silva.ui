(function($, infrae) {
    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMINavigation = function(smi, options) {
        var $navigation = this;
        var $tree = $navigation.children('.tree');
        var root_url = options.root_url;
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
                $tree.scrollLeft(21 * depth);
            });
        };

        var uncollapse = function(parents) {
            function open_node_chain(remaining) {
                var parent_node = $("#" + remaining[0]);
                var left = remaining.slice(1);
                if (parent_node.length > 0) {
                    if (left.length > 0) {
                        $tree.jstree('open_node',
                            parent_node, function(){ open_node_chain(left); });
                    } else {
                        $tree.jstree('open_node',
                            parent_node,
                            function(){
                                $tree.jstree('select_node', parent_node, true);
                            });
                    };
                    return true;
                };
                return false;
            };
            if (!open_node_chain(parents)) {
                $tree.jstree('deselect_all');
            };
        };

        var remove = function(info) {
            if (info.target === undefined)
                return;
            var $node = $('#' + info.target, $tree);
            if ($node.length > 0) {
                $tree.jstree('delete_node', $node);
            }
        };

        var add = function(info) {
            if (info.parent === undefined)
                return;
            var $parent = $('#' + info.parent, $tree);
            if ($parent.length > 0) {
                $tree.jstree('refresh', $parent);
            }
        };

        // Load the tree.
        $tree.jstree({
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
                            return root_url;
                        };
                        return url.expand({path: node.data('jstree').path});
                    }
                }
            }
        });

        // Bind JStree event to set the autoscroll.
        $tree.bind("open_node.jstree", function(event, data) {
            scroll($(this), data.rslt.obj.parents('ul').length - 2);
        });
        $tree.bind("close_node.jstree", function(event, data) {
            scroll($(this), data.rslt.obj.parents('ul').length - 3);
        });

        // Open view on click
        $tree.delegate('a', 'click', function(event) {
            smi.open_screen($(this).parent().data('jstree').path);
            return false;
        });

        // Disable text selection on tree
        infrae.ui.selection.disable($navigation);

        // Listen to smi.blur and focus to activate/disable shortcuts.
        $tree.jstree('disable_hotkeys');
        $navigation.bind('blur-keyboard', function() {
            $tree.jstree('disable_hotkeys');
        });
        $navigation.bind('focus-keyboard', function() {
            $tree.jstree('enable_hotkeys');
        });
        smi.shortcuts.create('navigation', $tree);

        return {
            invalidate: function(data) {
                if (data.length > 0) {
                    infrae.utils.each(data, function(datum) {
                        switch(datum['action']) {
                        case 'remove':
                            remove(datum['info']);
                            break;
                        case 'add':
                            add(datum['info']);
                            break;
                        }
                    });
                };
            },
            open: function(data) {
                uncollapse(data);
            }
        };
    };
})(jQuery, infrae);
