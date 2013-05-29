
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
            add: function(id, container_id, position) {
                var container = api.get_data(container_id);

                if (container !== undefined) {
                    var $container = api.get_dom(container_id);

                    if (container.children === undefined) {
                        container.children = [];
                    };
                    if (position < 0) {
                        container.children.push(id);
                    } else {
                        container.children.splice(position, 0, id);
                    };
                    if (container.state == 'open') {
                        api.fetch(container.path, [container.id, id]).then(function () {
                            var $node = api.render([id]).children('li'),
                                $list = $container.children('ul');

                            // There is always at least 1 node.
                            if (position > 0) {
                                $list.children('li:nth(' + (position - 1) + ')').after($node);
                            } else if (!position) {
                                $list.prepand($node);
                            } else {
                                $list.append($node);
                            };
                        });
                    } else if (container.state == 'item') {
                        container.state = 'closed';
                        if ($container.length) {
                            $container.removeClass('nav-item');
                            $container.addClass('nav-closed');
                        };
                    };
                };

            },
            update: function(id, container_id, position) {
                var container = api.get_data(container_id),
                    node = api.get_data(id);

                if (container !== undefined && container.children !== undefined) {
                    var index = $.inArray(id, container.children);

                    if (index != position) {
                        var $container = api.get_dom(container_id),
                            $node = api.get_dom(id);

                        container.children.splice(index, 1);
                        container.children.splice(position, 0, id);
                        if ($container.length && $node.length) {
                            var $list = $container.children('ul');

                            $node.detach();
                            if (position) {
                                $list.children('li:nth(' + (position - 1) + ')').after($node);
                            } else {
                                $list.prepend($node);
                            };
                        };
                    };
                };
                if (node !== undefined) {
                    // Update information from the server, replace the
                    // node link (if the title of icon changed).
                    api.fetch(node.path, []).then(function() {
                        var updated = api.get_data(id),
                            $node = api.get_dom(id);

                        updated.state = node.state;
                        updated.loaded = node.loaded;
                        if ($node.length) {
                            var $updated = $(render.expand(updated)).children('a');
                            $node.children('a').replaceWith($updated);
                        };
                    });
                };

            },
            remove: function(id, container_id) {
                var container = api.get_data(container_id);

                if (nodes[id] !== undefined) {
                    // Remove the node if it exists.
                    var $node = api.get_dom(id);
                    var remove = function(id) {
                        var node = nodes[id];
                        if (node !== undefined) {
                            if (node.children) {
                                for (var i=0, len=node.children.length; i<len; i++) {
                                    remove(node.children[i]);
                                };
                            };
                            delete nodes[id];
                        };
                    };

                    $node.remove();
                    remove(id);
                };
                if (container !== undefined && container.children !== undefined) {
                    // Remove the node if from the children ids.
                    var index = $.inArray(id, container.children);

                    if (index > -1) {
                        container.children.splice(index, 1);
                        if (!container.children.length) {
                            // We removed all the nodes
                            var $container = api.get_dom(container_id);

                            if (container.state == 'open') {
                                $container.removeClass('nav-open');
                                $container.addClass('nav-item');
                                $container.children('ul').remove();
                            } else {
                                $container.removeClass('nav-closed');
                            }
                            $container.addClass('nav-item');
                            container.state = 'item';
                        };
                    };
                };
            },
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
                }).then(function (additions) {
                    // Add new nodes to the list of nodes.
                    var added = [];

                    for (var i=0, len=additions.length; i < len; i++) {
                        nodes[additions[i].id] = additions[i];
                        added.push(additions[i].id);
                    };
                    return added;
                });
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
                if (data.navigation !== undefined) {
                    if (data.navigation.invalidation !== undefined) {
                        var records = data.navigation.invalidation;

                         if (records.length > 0) {
                             infrae.utils.each(records, function(record) {
                                 switch(record['action']) {
                                 case 'add':
                                     nodes.add(record.id, record.container, +record.position);
                                     break;
                                 case 'update':
                                     nodes.update(record.id, record.container, +record.position);
                                     break;
                                 case 'remove':
                                     nodes.remove(record.id, record.container);
                                     break;
                                 };
                             });
                         };
                    };
                    if (data.navigation.current !== undefined) {
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
