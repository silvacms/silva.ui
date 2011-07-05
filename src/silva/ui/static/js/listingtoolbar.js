
(function($, infrae) {


    /**
     * Return a function that evalute a list of JSON predicate.
     * @param predicates: list of predicates to evaluate.
     */
    var predicates_evaluator = function(predicates) {
        var conditions = [];

        for (var predicate in predicates) {
            switch(predicate) {
            case 'content_match':
                conditions.push(function($content, data) {
                    return infrae.utils.match(predicates.content_match, [data.content]);
                });
                break;
            case 'items_implements':
                conditions.push(function($content, data) {
                    if (typeof(predicates.items_implements) === "string") {
                        return infrae.interfaces.isImplementedBy(
                            predicates.items_implements, data.selection);
                    };
                    for (var i=0; i < predicates.items_implements.length; i++) {
                        if (infrae.interfaces.isImplementedBy(
                            predicates.items_implements[i], data.selection)) {
                            return true;
                        };
                    };
                    return false;
                });
                break;
            case 'items_match':
                conditions.push(function($content, data) {
                    return infrae.utils.match(predicates.items_match, data.selection.items);
                });
                break;
            case 'min_items':
                conditions.push(function($content, data) {
                    return data.selection.length >= predicates.min_items;
                });
                break;
            case 'max_items':
                conditions.push(function($content, data) {
                    return data.selection.length <= predicates.max_items;
                });
                break;
            case 'clipboard_min_items':
                conditions.push(function($content, data) {
                    return data.clipboard.length >= predicates.clipboard_min_items;
                });
                break;
            case 'input_mode':
                conditions.push(function($content, data) {
                    return data.input.status == predicates.input_mode;
                });
                break;
            };
        };

        return function() {
            for (var i=0; i < conditions.length; i++) {
                if (!conditions[i].apply(this, arguments))
                    return false;
            };
            return true;
        };
    };

    infrae.views.view({
        iface: ['action'],
        factory: function($content, data, transaction) {
            return {
                render: function() {
                    var promises = [];
                    var promise = null;

                    for (var action in data.actions) {
                        switch(action) {
                        case 'remove':
                            promise = transaction.listing.remove(data.actions.remove);
                            break;
                        case 'update':
                            promise = transaction.listing.update(data.actions.update);
                            break;
                        case 'add':
                            promise = transaction.listing.add(data.actions.add);
                            break;
                        case 'clear_clipboard':
                            promise = transaction.clipboard.clear(true);
                            break;
                        };
                        if (promise !== null) {
                            promises.push(promise);
                        };
                    };
                    if (promises.length) {
                        $.when.apply(this, promises).done(transaction.commit);
                    } else {
                        transaction.commit();
                    };
                }
            };
        }
    });


    /**
     * Create button kind-of-view that can be used to render actions.
     * @param group_definitions: list of action groups
     */
    var build_actions_renderer = function(group_definitions, shortcuts) {
        var renderers = [];

        var build_group = function(definitions) {
            var group = infrae.views.Registry();

            var build_button = function(definition) {
                var button = {
                    order: definition.order,
                    ifaces: definition.ifaces
                };
                if (definition.title != null) {
                    button['factory'] = function($content, data) {
                        var view = {
                            render: function() {
                                var $action = $('<li><a class="ui-state-default"><span>' +
                                                definition.title + '</span></a></li>');
                                var $trigger = $action.children('a');

                                if (definition.icon) {
                                    $trigger.children('span').addClass('have-icon');
                                    $trigger.prepend(
                                        '<div class="action-icon"><ins class="ui-icon ui-icon-' +
                                            definition.icon + '"></ins></div>');
                                };
                                if (view.action != undefined) {
                                    var action = function() {
                                        if (definition.confirmation)
                                            infrae.ui.ConfirmationDialog(definition.confirmation).done(view.action);
                                        else
                                            view.action();
                                        return false;
                                    };

                                    $trigger.bind('click', action);
                                    if (definition.accesskey)
                                        shortcuts.bind('listing', 'actions', definition.accesskey, action);
                                };
                                $content.append($action);
                            }
                        };
                        if (definition.action != undefined) {
                            for (var action_type in definition.action) {
                                switch(action_type) {
                                case 'rest':
                                    view['action'] = function() {
                                        var payload = [];
                                        switch(definition.action.rest.send) {
                                        case 'selected_ids':
                                            infrae.utils.map(data.selection.items, function(item) {
                                                return {name: 'content', value: item.id};
                                            }, payload);
                                            break;
                                        case 'clipboard_ids':
                                            infrae.utils.map(data.clipboard.cutted, function(item) {
                                                    return {name: 'cutted', value: item.id};
                                            }, payload);
                                            infrae.utils.map(data.clipboard.copied, function(item) {
                                                    return {name: 'copied', value: item.id};
                                            }, payload);
                                            break;
                                        }
                                        data.query_server(definition.action.rest.action, payload).pipe(
                                            function (result) {
                                                return $content.render({data: result, args: [data.get_transaction()]});
                                            });
                                    };
                                    break;
                                case 'cut':
                                    view['action'] = function () {
                                        var transaction = data.get_transaction();
                                        transaction.clipboard.cut(data.selection.items);
                                        transaction.commit();
                                    };
                                    break;
                                case 'copy':
                                    view['action'] = function () {
                                        var transaction = data.get_transaction();
                                        transaction.clipboard.copy(data.selection.items);
                                        transaction.commit();
                                    };
                                    break;
                                case 'input':
                                    view['action'] = function() {
                                        var save = $.Deferred();
                                        var transaction = data.get_transaction();

                                        save.done(function(values) {
                                            var count = 0;
                                            var payload = [];
                                            infrae.utils.each(values, function(value) {
                                                for (var name in value)
                                                    payload.push({name: 'values.' + count + '.' + name, value: value[name]});
                                                count += 1;
                                            });
                                            payload.push({name: 'values', value: count});
                                            return data.query_server(
                                                definition.action.input.action,
                                                payload).pipe(
                                                    function (result) {
                                                        return $content.render({data: result, args: [transaction]});
                                                    });
                                        });
                                        transaction.input.input(save);
                                        transaction.commit();
                                    };
                                    break;
                                case 'input_mode':
                                    view['action'] = function() {
                                        var transaction = data.get_transaction();
                                        transaction.input.collect(definition.action.input_mode);
                                        transaction.commit();
                                    };
                                    break;
                                case 'form':
                                    view['action'] = function() {
                                        var url = $('#content-url').attr('href');

                                        return $content.SMIFormPopup({
                                            url: url + '/++rest++' + definition.action.form.name});
                                    };
                                    break;
                                };
                            };
                        };
                        return view;
                    };
                } else {
                    var subgroup = build_group(definition.actions);

                    button['factory'] = function($content, data) {
                        return {
                            render: function() {
                                var $dropdown = $('<div class="dropdown"><ol></ol></div');

                                subgroup.render($dropdown.children('ol'), {every: data});

                                // Take the first action and use it as top-level action.
                                var $first = $dropdown.find('li:first');
                                if ($first.length) {
                                    var $action = $first.detach();

                                    if ($dropdown.find('li:first').length) {
                                        var $trigger = $action.children('a');
                                        var $opener = $(
                                            '<div class="dropdown-icon"><ins class="ui-icon ui-icon-triangle-1-s"></ins></div>');

                                        $opener.bind('click', function() {
                                            $dropdown.fadeToggle();
                                            return false;
                                        });
                                        $dropdown.bind('mouseleave', function() {
                                            $dropdown.fadeOut('fast');
                                        });
                                        $trigger.prepend($opener);
                                        $action.append($dropdown);
                                    };
                                    $content.append($action);
                                };
                            }
                        };
                    };
                };
                if (definition.available) {
                    button['available'] = predicates_evaluator(definition.available);
                };
                group.register(button);
            };
            infrae.utils.each(definitions, build_button);
            return group;
        };

        $.each(group_definitions, function(i, definition) {
            var group = build_group(definition.actions);
            var available = predicates_evaluator(definition.available);

            renderers.push(function($content, data) {
                if (!available($content, data))
                    return;

                var $actions = $('<div class="actions"><ol></ol></div>');
                var $container = $actions.children('ol');

                infrae.ui.selection.disable($actions);
                group.render($container, {every: data});
                var $last = $container.children('li:last');
                if ($last.length) {
                    // Add a class to style fix IE 8
                    $last.addClass('last-action');
                    $content.append($actions);
                };
            });
        });

        return function($content, listing) {
            listing.events.status(function() {
                shortcuts.remove('listing', 'actions');
                $content.children('div.actions').remove();
                for (var index=0; index < renderers.length; index++) {
                    renderers[index]($content, this);
                };
            });
        };
    };

    /**
     * Manage a selector that can unselect / select all
     * element in a listing, and view selection status.
     * @param $selector: JQuery object representing the selector
     * @param listing: managed listing
     */
    var render_multi_selector = function($selector, shortcuts, listing) {
        var status = 'none';

        var set_status = function(new_status) {
            $selector.removeClass(status);
            $selector.addClass(new_status);
            status = new_status;
        };

        // Update selector on selection change
        listing.events.status(function() {
            if (this.selection.length == 0) {
                set_status('none');
            } else if (this.selection.length == this.length) {
                set_status('all');
            } else if (this.selection.length == 1) {
                set_status('single');
            } else {
                set_status('partial');
            };
        });

        var change_status = function() {
            if (status == 'none') {
                listing.select_all();
            } else {
                listing.unselect_all();
            };
            return false;
        };

        // Clicking on the selector change the selection.
        $selector.bind('click', change_status);
        shortcuts.bind('listing', null, ['ctrl+a'], change_status);
    };

    /**
     * Manage the filter field.
     * @param $filter: JQuery object representing the filter field
     * @param listing: Listing to operate on
     */
    var render_filter = function($filter, shortcuts, listing) {
        // We use a timeout of 100ms for fast typing people on poor computers.
        var timeout = null;

        shortcuts.bind('listing', null, ['ctrl+f'], function() {
            $filter.focus();
            return false;
        });
        $filter.bind('keyup', function(event) {
            var clear = false;

            if (event.keyCode == 13) {
                // Enter unfocus the field
                $filter.blur();
                return;
            } else if (event.keyCode == 27) {
                // Escape clear the field
                clear = true;
                $filter.blur();
            };
            if (timeout) {
                clearTimeout(timeout);
            };
            timeout = setTimeout(function() {
                var value = '';

                if (clear) {
                    $filter.val('');
                } else {
                    value = $filter.val();
                };
                listing.filter_lines(value);
                timeout = null;
            }, 100);
        });
    };

    $(document).bind('load-smilisting', function(event, data) {
        var configuration = data.configuration;
        var smi = data.smi;
        var render_actions = build_actions_renderer(configuration.actions, smi.shortcuts);

        infrae.views.view({
            iface: 'listing',
            name: 'toolbar',
            factory: function($content, data, smi, listing) {
                return {
                    html_url: smi.options.listing.templates.toolbar,
                    render: function() {
                        var shortcuts = smi.shortcuts;

                        // Render actions
                        render_actions($content, listing);

                        // Render multi selector
                        render_multi_selector($content.find('.selector ins'), shortcuts, listing);

                        // Render filter
                        render_filter($content.find('.filter input'), shortcuts, listing);
                    },
                    cleanup: function() {
                        $content.unbind('actionrefresh-smilisting');
                        $content.empty();
                    }
                };
            }
        });


    });

})(jQuery, infrae);
