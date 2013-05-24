
(function($, infrae, jsontemplate) {

    var NodeController = function(nodes, $node, node) {
        // API on 1 node.
        var api = {
            expand: function() {
                var promise = $.Deferred().resolve(node);

                // Expand one node if it is closed.
                if (node.state == 'closed')  {
                    $node.removeClass('nav-closed');
                    $node.addClass('nav-open');
                    if (node.children) {
                        if (!node.loaded) {
                            promise = nodes.fetch(node.path, [node.id]);
                        };
                        promise = promise.then(function () {
                            var $child = nodes.render(node.children);

                            $child.hide();
                            $node.append($child);
                            $child.slideDown(150);
                            return node;
                        });
                    };
                    node.state = 'open';
                };
                return promise;
            },
            collapse: function() {
                // Collapse one node if it is opened.
                if (node.state == 'open') {
                    $node.removeClass('nav-open');
                    $node.addClass('nav-closed');
                    $node.children('ul').remove();
                    node.state = 'closed';

                    var close = function(node) {
                        for (var i=0, len=node.children.length; i < len ; i++) {
                            var child = nodes.get_data(node.children[i]);

                            if (child !== undefined && child.state == 'open') {
                                child.state = 'closed';
                                close(child);
                            };
                        };
                    };
                    close(node);
                };
            },
            toggle: function() {
                // Toggle a node.
                if (node.state == 'open') {
                    api.collapse();
                } else if (node.state == 'closed') {
                    api.expand();
                };
            }
        };
        return api;
    };

    var NodesController = function($root, url) {
        var render = new jsontemplate.Template(
            '<li id="nav-{id}" class="nav-{state|htmltag}" data-path="{path|htmltag}"><ins class="icon nav-status" /><a><ins class="icon {icon|htmltag}" />{title}</a></li>'),
            nodes = {},
            dom_node_id_to_id = /nav-(\d+)/;

        var api = {
            fetch: function(path, ids) {
                // Fetch node information from the server.
                var data = [];

                for (var i=0, len=ids.length; i < len; i++) {
                    data.push({name: 'recurse', value: ids[i]});
                };
                return $.ajax({
                    url: url.expand({path: path}),
                    type: 'POST',
                    data: data,
                    dataType: 'json'
                }).pipe(api.add);
            },
            add: function(additions) {
                // Add new nodes to the list of nodes.
                var added = [];

                for (var i=0, len=additions.length; i < len; i++) {
                    nodes[additions[i].id] = additions[i];
                    added.push(additions[i].id);
                };
                return added;
            },
            get_data: function(id) {
                return nodes[id];
            },
            get_dom: function(id) {
                return $root.find('#nav-' + id);
            },
            get_node: function($node) {
                // Find the node API corresponding to one node.
                var match = $node.attr('id').match(dom_node_id_to_id);

                if (match) {
                    var id = +match[1];
                    if (nodes[id] !== undefined) {
                        return NodeController(api, $node, nodes[id]);
                    };
                };
                return undefined;
            },
            render: function(ids) {
                // Render a list of nodes from their ids as a single
                // non-attached dom object.
                var $nodes = $('<ul />');

                for (var i=0, len=ids.length; i < len; i++) {
                    var node = nodes[ids[i]],
                        $node = $(render.expand(node));

                    if (node.children && node.state == 'open') {
                        $node.append(api.render(node.children));
                    };
                    $nodes.append($node);
                };
                return $nodes;
            },
            expand: function(ids) {
                // From the navigation render and expand the given nodes.
                var node = null, next,
                    open = null,
                    deferred = null;

                // There is always at least one node here, the root node.
                for (var index=0, len=ids.length; index < len; index++) {
                    next = nodes[ids[index]];
                    if (next === undefined) {
                        var requires = [node.id];

                        for (; index < len; index++) {
                            requires.push(ids[index]);
                        };
                        if (open === null) {
                            open = node;
                        };
                        deferred = api.fetch(node.path, requires);
                        break;
                    };
                    node = next;
                    if (open === null && node.state == 'closed') {
                        open = node;
                    };
                };
                if (deferred === null && !node.loaded) {
                    if (open === null) {
                        open = node;
                    };
                    deferred = api.fetch(node.path, [node.id]);
                };
                if (open !== null) {
                    if (deferred === null) {
                        deferred = $.Deferred().resolve([]);
                    };
                    return deferred.pipe(function() {
                        var $node = api.get_dom(open.id),
                            $child = api.render(open.children);

                        open.state = 'open';
                        $child.hide();
                        $node.removeClass('nav-closed');
                        $node.addClass('nav-open');
                        $node.append($child);
                        $child.slideDown(150);
                        return open;
                    });
                };
                return $.Deferred().resolve();
            }
        };
        return api;
    };


    var NavigationManager = function(smi, options) {
        var $root = $(options.navigation.selector).children('.tree'),
            $current = null;
        var nodes = NodesController(
            $root,
            new jsontemplate.Template(options.navigation.url, {}));

        $root.delegate('a', 'click', function() {
            var $node = $(this).parent();

            smi.open_screen($node.data('path'));
        });

        $root.delegate('ins.nav-status', 'click', function() {
            nodes.get_node($(this).parent()).toggle();
        });

        // Render root node
        $.ajax(options.navigation.root_url).pipe(nodes.add).pipe(function(data) {
            var $tree = nodes.render([data[0]]);
            $tree.children('li').addClass('nav-root');
            $root.html($tree);
        });

        return {
            page: function(data) {
                if (data.navigation != undefined) {
                    if (data.navigation.current != undefined) {
                        var current = data.navigation.current;

                        if ($current !== null) {
                            $current.removeClass('nav-current');
                        };
                        nodes.expand(current).then(function() {
                            var $node = nodes.get_dom(current[current.length - 1]);

                            $node.addClass('nav-current');
                            $current = $node;
                        });
                    };
                };
                return null;
            }
        };
    };

    $.extend(infrae.smi.plugins, {
        navigation: NavigationManager
    });

})(jQuery, infrae, jsontemplate);
