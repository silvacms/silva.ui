
(function($, infrae, jsontemplate) {

    var Node = function(nodes, $node, data) {
        /** API to modify the state of one node:
         *  - nodes is the object controlling all the dom,
         *  - $node the jQuery object mapped to the DOM,
         *  - data is object representing the internal state of the node.
         */
        var api = {
            expand: function() {
                var promise = $.Deferred().resolve(data);

                // Expand one node if it is closed.
                if (data.state == 'closed')  {
                    $node.removeClass('nav-closed');
                    $node.addClass('nav-open');
                    if (data.children) {
                        if (!data.loaded) {
                            promise = nodes.fetch(data.path, [data.id]);
                        };
                        promise = promise.then(function () {
                            var $child = nodes.render(data.children);

                            $child.hide();
                            $node.append($child);
                            $child.slideDown(150);
                            return data;
                        });
                    };
                    data.state = 'open';
                };
                return promise;
            },
            collapse: function() {
                // Collapse one node if it is opened.
                if (data.state == 'open') {
                    $node.removeClass('nav-open');
                    $node.addClass('nav-closed');
                    $node.children('ul').remove();
                    data.state = 'closed';

                    var close = function(data) {
                        for (var i=0, len=data.children.length; i < len ; i++) {
                            var child = nodes.get_data(data.children[i]);

                            if (child !== null && child.state == 'open') {
                                child.state = 'closed';
                                close(child);
                            };
                        };
                    };
                    close(data);
                };
            },
            toggle: function() {
                // Toggle a node.
                if (data.state == 'open') {
                    api.collapse();
                } else if (data.state == 'closed') {
                    api.expand();
                };
            }
        };
        return api;
    };

    var Nodes = function($root, url) {
        /**
         * API to access and modify the state of multiple navigation nodes.
         * - $root is a jQuery object where the node will be rendered,
         * - url is a template to fetch information from the server.
         */
        var render = new jsontemplate.Template(
            '<li id="nav-{id}" class="nav-{state|htmltag}" data-path="{path|htmltag}"><ins class="icon nav-status" /><a>{.section icon}<ins class="icon {@|htmltag}" />{.end}{.section url}<ins class="icon" style="background:url(\'{@|htmltag}\') no-repeat center center;" />{.end}{title}</a></li>'),
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
                }).then(api.add);
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
                        return Node(api, $node, nodes[id]);
                    };
                };
                return null;
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
                var node = {id: ids[0], path: '', state: 'item', loaded: true, children: [ids[0]]},
                    next = undefined,
                    open = null,
                    deferred = null;

                // For each node check if they are loaded.
                for (var index=0, len=ids.length; index < len; index++) {
                    next = nodes[ids[index]];
                    if (next === undefined) {
                        // Load the missing nodes.
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
                        // The node is here but check if it is open.
                        open = node;
                    };
                };
                if (deferred === null && !node.loaded) {
                    // All the nodes are here, but check if the last node is loaded.
                    if (open === null) {
                        open = node;
                    };
                    deferred = api.fetch(node.path, [node.id]);
                };
                if (open !== null) {
                    if (deferred === null) {
                        // We don't need to fetch data.
                        deferred = $.Deferred().resolve([]);
                    };
                    return deferred.then(function() {
                        var $node = api.get_dom(open.id),
                            $child = api.render(open.children);

                        open.state = 'open';
                        $child.hide();
                        if ($node.length) {
                            // Add the child under the closed node.
                            $node.removeClass('nav-closed');
                            $node.addClass('nav-open');
                            $node.append($child);
                        } else {
                            // There is no rendered node, add the root.
                            $child.children('li').addClass('nav-root');
                            $root.append($child);
                        };
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
            url = jsontemplate.Template(options.navigation.url, {}),
            $current = null,
            nodes = Nodes($root, url);


        $root.delegate('a', 'click', function() {
            var $node = $(this).parent();

            smi.open_screen($node.data('path'));
        });

        $root.delegate('ins.nav-status', 'click', function() {
            nodes.get_node($(this).parent()).toggle();
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
