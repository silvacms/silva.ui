
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
                conditions.push(function($content, data, smi) {
                    return infrae.utils.match([data.content], predicates.content_match);
                });
                break;
            case 'items_implements':
                conditions.push(function($content, data, smi) {
                    if (typeof(predicates.items_implements) === "string")
                        return infrae.interfaces.isImplementedBy(predicates.items_implements, data);
                    for (var i=0; i < predicates.items_implements.length; i++)
                        if (infrae.interfaces.isImplementedBy(predicates.items_implements[i], data))
                            return true;
                    return false;
                });
                break;
            case 'items_match':
                conditions.push(function($content, data, smi) {
                    return infrae.utils.match(data.items(), predicates.items_match);
                });
                break;
            case 'min_items':
                conditions.push(function($content, data, smi) {
                    return data.length() >= predicates.min_items;
                });
                break;
            case 'max_items':
                conditions.push(function($content, data, smi) {
                    return data.length() <= predicates.max_items;
                });
                break;
            case 'clipboard_min_items':
                conditions.push(function($content, data, smi) {
                    return smi.clipboard.length() >= predicates.clipboard_min_items;
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
        iface: ['actionresult'],
        factory: function($content, data, smi, selection) {
            return {
                render: function() {
                    for (var post_action in data.post_actions) {
                        switch(post_action) {
                        case 'remove':
                            selection.remove(data.post_actions.remove);
                            break;
                        case 'update':
                            selection.update(data.post_actions.update);
                            break;
                        case 'add':
                            selection.add(data.post_actions.add);
                            break;
                        case 'clear_clipboard':
                            smi.clipboard.clear(true);
                            break;
                        };
                    };
                    if (data.notifications) {
                        smi.notifications.notifies(data.notifications);
                    };
                }
            };
        }
    });


    /**
     * Create button kind-of-view that can be used to render actions.
     * @param group_definitions: list of action groups
     * @param url_template: base URL to use for REST-type actions
     */
    var build_actions_renderer = function(group_definitions, url_template) {
        var renderers = [];

        var build_group = function(definitions) {
            var group = infrae.views.Registry();

            var build_button = function(definition) {
                var button = {
                    order: definition.order,
                    title: definition.title
                };
                if (definition.title != null) {
                    button['factory'] = function($content, data, smi) {
                        var collecting = false;
                        var view = {
                            render: function() {
                                var $action = $('<li><a class="ui-state-default"><span>' +
                                                definition.title + '</span></a></li>');
                                var $trigger = $action.children('a');

                                if (definition.icon) {
                                    $trigger.prepend(
                                        '<div class="action-icon"><ins class="ui-icon ui-icon-' +
                                            definition.icon + '"></ins></div>');
                                };
                                if (definition.accesskey) {
                                    $trigger.attr('accesskey', definition.accesskey);
                                };
                                if (view.action != undefined) {
                                    $trigger.bind('click', function() {
                                        view.action();
                                    });
                                };
                                $content.append($action);
                            }
                        };
                        if (definition.action != undefined) {
                            for (var action_type in definition.action) {
                                switch(action_type) {
                                case 'rest':
                                    view['action'] = function() {
                                        var url = url_template.expand({path: smi.opened.path,
                                                                       action: definition.action.rest.action});
                                        var payload = [];
                                        switch(definition.action.rest.send) {
                                        case 'selected_ids':
                                            $.each(data.items(), function(i, item) {
                                                payload.push({name: 'content', value: item.id});
                                            });
                                            break;
                                        case 'clipboard_ids':
                                            $.each(smi.clipboard.cutted, function(i, item) {
                                                payload.push({name: 'cutted', value: item.id});
                                            });
                                            $.each(smi.clipboard.copied, function(i, item) {
                                                payload.push({name: 'copied', value: item.id});
                                            });
                                            break;
                                        case 'item_values':
                                            var names = definition.action.rest.values;
                                            var counter = 0;

                                            if (!collecting) {
                                                data.inputs(names);
                                                collecting = true;
                                                return;
                                            };
                                            data.values(names, function(data) {
                                                var prefix = 'values.' + counter.toString() + '.';
                                                for (var key in data) {
                                                    payload.push({name: prefix + key, value: data[key]});
                                                };
                                                counter += 1;
                                            });
                                            payload.push({name: 'values', value: counter.toString()});
                                            collecting = false;
                                            break;
                                        }
                                        $.ajax({
                                            url: url,
                                            type: 'POST',
                                            dataType: 'json',
                                            data: payload,
                                            success: function(result) {
                                                $content.render({data: result, args: [smi, data]});
                                            }
                                        });
                                    };
                                    break;
                                case 'cut':
                                    view['action'] = function () {
                                        smi.clipboard.cut(data.data);
                                        $content.trigger(
                                            'actionrefresh-smilisting', {data: data});
                                    };
                                    break;
                                case 'copy':
                                    view['action'] = function () {
                                        smi.clipboard.copy(data.data);
                                        $content.trigger(
                                            'actionrefresh-smilisting', {data: data});
                                    };
                                    break;
                                case 'form':
                                    view['action'] = function() {
                                        var url = $('#content-url').attr('href');

                                        return $content.SMIFormPopup(url + '/++rest++' + definition.action.form.name);
                                    };
                                    break;
                                };
                            };
                        };
                        return view;
                    };
                } else {
                    var subgroup = build_group(definition.actions);

                    button['factory'] = function($content, data, smi) {
                        return {
                            render: function() {
                                var $dropdown = $('<div class="dropdown"><ol></ol></div');

                                subgroup.render($dropdown.children('ol'), {every: data, args:[smi]});

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

        $.each(group_definitions, function(i, group_definition) {
            var group = build_group(group_definition);

            renderers.push(function($content, data, args) {
                var $actions = $('<div class="actions"><ol></ol></div>');

                infrae.ui.selection.disable($actions);
                group.render($actions.children('ol'), {every: data, args: args});
                if ($actions.find('li:first').length) {
                    $content.append($actions);
                };
            });
        });

        return function($content, data, args) {
            $content.children('div.actions').remove();
            $.each(renderers, function() {
                this($content, data, args);
            });
        };
    };

    /**
     * Manage a selector that can unselect / select all
     * element in a listing, and view selection status.
     * @param $selector: JQuery object representing the selector
     * @param listing: managed listing
     */
    var render_multi_selector = function($selector, listing) {
        var status = 'none';

        var set_status = function(new_status) {
            $selector.removeClass(status);
            $selector.addClass(new_status);
            status = new_status;
        };

        // Update selector on selection change
        listing.$content.bind('selectionchange-smilisting', function(event, changes) {
            if (changes.selected == 0) {
                set_status('none');
            } else if (changes.selected == changes.visible) {
                set_status('all');
            } else if (changes.selected == 1) {
                set_status('single');
            } else {
                set_status('partial');
            };
        });

        // Clicking on the selector change the selection.
        $selector.bind('click', function() {
            if (status == 'none') {
                listing.select_all();
            } else {
                listing.unselect_all();
            };
            return false;
        });
    };

    /**
     * Manage the filter field.
     * @param $filter: JQuery object representing the filter field
     * @param listing: Listing to operate on
     */
    var render_filter = function($filter, listing) {
        // We use a timeout of 100ms for fast typing people on poor computers.
        var timeout = null;

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

    /**
     * Represent a selection of multiple items in a listing.
     * @param items: selected rows (must have the .item class).
     */
    var SMISelection = function(listing, content, items) {
        this.listing = listing;
        this.content = content;

        this._raw_items = items;
        this._refresh_data();
    };

    // Compute selection data
    SMISelection.prototype._refresh_data = function () {
        this.ifaces = [];
        this.data = [];

        $.each(this._raw_items, function (i, item) {
            var local_data = $(item).data('smilisting');

            for (var e=0; e < local_data.ifaces.length; e++) {
                if ($.inArray(local_data.ifaces[e], this.ifaces) < 0) {
                    this.ifaces.push(local_data.ifaces[e]);
                };
            };
            this.data.push(local_data);
        }.scope(this));
    };

    /**
     * Return the size of the selection.
     */
    SMISelection.prototype.length = function() {
        return this._raw_items.length;
    };

    /**
     * Add data to the listing (and selection).
     */
    SMISelection.prototype.add = function(data) {
        this.listing.add_lines(data);
    };

    /**
     * Return the items of the selection.
     */
    SMISelection.prototype.items = function() {
        return this.data;
    };

    /**
     * Update some selected items.
     */
    SMISelection.prototype.update = function(items) {
        if (items.length) {
            this.listing.update_lines(items);
            this._refresh_data();
            return true;
        };
        return false;
    };

    SMISelection.prototype.values = function(names, processor) {
        var column_index = this.listing.configuration.column_index;

        $.each(this._raw_items, function(i, line) {
            var $line = $(line);
            var collected = {};
            collected['id'] = $line.data('smilisting')['id'];
            $.each(names, function(e, name) {
                var index = column_index(name);
                var $input = $line.children(':eq(' + index + ')').children('input');
                collected[name] = $input.val();
            });
            processor(collected);
        });
    };

    SMISelection.prototype.inputs = function(names) {
        var promise = this.listing.selection.events.promise();

        if (promise != null) {
            promise.template.until(function(element) {
                $(element).trigger('inputline-smilisting', {names: names});
            }, true);
            promise.template.done(function(element) {
                $(element).trigger('refreshline-smilisting');
            }, true);
        }
    };

    /**
     * Remove some items associated to the selection.
     * @param ids: content id of the line to remove.
     */
    SMISelection.prototype.remove = function(ids) {
        this.listing.remove_lines(ids);
    };


    $(document).bind('load-smilisting', function(event, data) {
        var configuration = data.configuration;
        var smi = data.smi;
        var url_template = jsontemplate.Template(smi.options.listing.action, {});
        var render_actions = build_actions_renderer(configuration.actions, url_template);

        infrae.views.view({
            iface: 'listing',
            name: 'toolbar',
            factory: function($content, data, smi, listing) {
                return {
                    html_url: smi.options.listing.templates.toolbar,
                    render: function() {
                        // Render actions
                        render_actions(
                            $content,
                            new SMISelection(listing, data.content, $([])),
                            [smi]);
                        $content.bind('actionrefresh-smilisting', function(event, data) {
                            render_actions($content, data.data, [smi]);
                            event.stopPropagation();
                            event.preventDefault();
                        });
                        listing.$content.bind('selectionchange-smilisting', function(event, changes) {
                            render_actions(
                                $content,
                                new SMISelection(listing, data.content, changes.items),
                                [smi]);
                        });

                        // Render multi selector
                        render_multi_selector($content.find('.selector ins'), listing);

                        // Render filter
                        render_filter($content.find('.filter input'), listing);

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
