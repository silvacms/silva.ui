

(function($, obviel) {

    /**
     * Helper that return true if one object in data match all conditions.
     * @param data: list of object with properties
     * @param conditions: object with properties that are list of
     *        possible values that a data object must have in order to
     *        match.
     */
    var objects_match = function(data, conditions) {
        for (var i=0; i < data.length; i++) {
            var item = data[i];
            var missing = false;

            for (var property in conditions) {
                if ($.inArray(item[property], conditions[property]) < 0) {
                    missing = true;
                    break;
                };
            };
            if (!missing) {
                return true;
            };
        };
        return false;
    };

    /**
     * Return a function that evalute a list of JSON predicate.
     * @param predicates: list of predicates to evaluate.
     */
    var predicates_evaluator = function(predicates) {
        var conditions = [];

        for (var predicate in predicates) {
            switch(predicate) {
            case 'content_match':
                conditions.push(function() {
                    return objects_match([this.data.content], predicates.content_match);
                });
                break;
            case 'items_provides':
                conditions.push(function() {
                    if (typeof(predicates.items_provides) === "string")
                        return obviel.provides(this.data, predicates.items_provides);
                    for (var i=0; i < predicates.items_provides.length; i++)
                        if (obviel.provides(this.data, predicates.items_provides[i]))
                            return true;
                    return false;
                });
                break;
            case 'items_match':
                conditions.push(function() {
                    return objects_match(this.data.items(), predicates.items_match);
                });
                break;
            case 'min_items':
                conditions.push(function() {
                    return this.data.length() >= predicates.min_items;
                });
                break;
            case 'max_items':
                conditions.push(function() {
                    return this.data.length() <= predicates.max_items;
                });
                break;
            case 'clipboard_min_items':
                conditions.push(function() {
                    return this.smi.clipboard.length() >= predicates.clipboard_min_items;
                });
                break;
            };
        };
        return function() {
            for (var i=0; i < conditions.length; i++) {
                if (!conditions[i].apply(this))
                    return false;
            };
            return true;
        };
    };


    obviel.view({
        iface: ['actionresult'],
        render: function() {
            var need_refresh = false;

            for (var post_action in this.data.post_actions) {
                switch(post_action) {
                case 'remove':
                    need_refresh |= this.selection.remove(this.data.post_actions.remove);
                    break;
                case 'update':
                    need_refresh |= this.selection.update(this.data.post_actions.update);
                    break;
                case 'add':
                    this.selection.add(this.data.post_actions.add);
                    break;
                case 'clear_clipboard':
                    this.smi.clipboard.clear(true);
                    break;
                };
            };
            if (need_refresh) {
                this.$content.trigger(
                    'actionrefresh-smilisting', {data: this.selection});
            };
            if (this.data.notifications) {
                this.smi.notifications.notifies(this.data.notifications);
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

        var build_group = function(group_definition) {
            var group = new obviel.Registry();

            $.each(group_definition, function(i, action_definition) {
                var definition = {
                    order: action_definition.order
                };
                if (action_definition.title != null) {
                    definition['init'] = function() {
                        this.collecting = false;
                    };
                    definition['render'] = function() {
                        var $action = $('<li><a class="ui-state-default"><span>' +
                                        action_definition.title + '</span></a></li>');
                        var $trigger = $action.children('a');

                        if (action_definition.icon) {
                            $trigger.prepend(
                                '<div class="action-icon"><ins class="ui-icon ui-icon-' +
                                    action_definition.icon +
                                    '"></ins></div>');
                        };
                        if (action_definition.accesskey) {
                            $trigger.attr('accesskey', action_definition.accesskey);
                        };
                        this.$content.append($action);
                        if (this.action != undefined) {
                            $trigger.bind('click', function() {
                                this.action();
                            }.scope(this));
                        };
                    };
                    if (action_definition.action != undefined) {
                        for (var action_type in action_definition.action) {
                            switch(action_type) {
                            case 'rest':
                                definition['action'] = function() {
                                    var url = url_template.expand({
                                        path: this.smi.opened.path,
                                        action: action_definition.action.rest.action});
                                    var payload = [];
                                    switch(action_definition.action.rest.send) {
                                    case 'selected_ids':
                                        $.each(this.data.items(), function(i, item) {
                                            payload.push({name: 'content', value: item.id});
                                        });
                                        break;
                                    case 'clipboard_ids':
                                        $.each(this.smi.clipboard.cutted, function(i, item) {
                                            payload.push({name: 'cutted', value: item.id});
                                        });
                                        $.each(this.smi.clipboard.copied, function(i, item) {
                                            payload.push({name: 'copied', value: item.id});
                                        });
                                        break;
                                    case 'item_values':
                                        var names = action_definition.action.rest.values;
                                        var counter = 0;

                                        if (!this.collecting) {
                                            this.data.inputs(names);
                                            this.collecting = true;
                                            return;
                                        };
                                        this.data.values(names, function(data) {
                                            var prefix = 'values.' + counter.toString() + '.';
                                            for (var key in data) {
                                                payload.push({name: prefix + key, value: data[key]});
                                            };
                                            counter += 1;
                                        });
                                        payload.push({name: 'values', value: counter.toString()});
                                        this.collecting = false;
                                        break;
                                    }
                                    $.ajax({
                                        url: url,
                                        type: 'POST',
                                        dataType: 'json',
                                        data: payload,
                                        success: function(result) {
                                            this.$content.render({data: result,
                                                                  extra: {selection: this.data,
                                                                          smi: this.smi}});
                                        }.scope(this)
                                    });
                                };
                                break;
                            case 'cut':
                                definition['action'] = function () {
                                    this.smi.clipboard.cut(this.data.data);
                                    this.$content.trigger(
                                        'actionrefresh-smilisting', {data: this.data});
                                };
                                break;
                            case 'copy':
                                definition['action'] = function () {
                                    this.smi.clipboard.copy(this.data.data);
                                    this.$content.trigger(
                                        'actionrefresh-smilisting', {data: this.data});
                                };
                                break;
                            case 'form':
                                definition['action'] = function() {
                                    var url = $('#content-url').attr('href');

                                    return this.$content.SMIFormPopup(
                                        url + '/++rest++' + action_definition.action.form.name);
                                };
                                break;
                            };
                        };
                    };
                } else {
                    var subgroup = build_group(action_definition.actions);

                    definition['render'] = function() {
                        var $dropdown = $('<div class="dropdown"><ol></ol></div');

                        subgroup.render(
                            $dropdown.children('ol'),
                            {every: this.data, extra: {smi: this.smi}});

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
                            this.$content.append($action);
                        };
                    };
                };
                if (action_definition.available) {
                    definition['available'] = predicates_evaluator(action_definition.available);
                };
                group.register(definition);
            });
            return group;
        };

        $.each(group_definitions, function(i, group_definition) {
            var group = build_group(group_definition);

            renderers.push(function($content, data, extra) {
                var $actions = $('<div class="actions"><ol></ol></div>');
                $actions.disableTextSelect();

                group.render($actions.children('ol'), {every: data, extra: extra});
                if ($actions.find('li:first').length) {
                    $content.append($actions);
                };
            });
        });

        return function($content, data, extra) {
            $content.children('div.actions').remove();
            $.each(renderers, function() {
                this($content, data, extra);
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
        listing.$content.bind(
            'selectionchange-smilisting', function(event, changes) {
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
        this._raw_items.trigger('inputline-smilisting', {names: names});
    };

    /**
     * Remove some items associated to the selection.
     * @param ids: content id of the line to remove.
     */
    SMISelection.prototype.remove = function(ids) {
        this.listing.remove_lines(ids);
    };

    /**
     * Close the current selection (unselect it).
     */
    SMISelection.prototype.close = function() {
        this.listing.unselect(this._raw_items);
    };


    $(document).bind('load-smilisting', function(event, data) {
        var configuration = data.configuration;
        var smi = data.smi;
        var url_template = jsontemplate.Template(smi.options.listing.action, {});
        var render_actions = build_actions_renderer(configuration.actions, url_template);

        obviel.view({
            iface: 'listing',
            name: 'toolbar',
            html_url: smi.options.listing.templates.toolbar,
            render: function($content, data) {
                var listing = this.view;
                var smi = this.smi;

                // Render actions
                render_actions(
                    $content,
                    new SMISelection(listing, data.content, $([])),
                    {smi: smi});
                $content.bind('actionrefresh-smilisting', function(event, data) {
                    render_actions($content, data.data, {smi: smi});
                    event.stopPropagation();
                    event.preventDefault();
                });
                listing.$content.bind('selectionchange-smilisting', function(event, changes) {
                    render_actions(
                        $content,
                        new SMISelection(listing, data.content, changes.items),
                        {smi: smi});
                });

                // Render multi selector
                render_multi_selector($content.find('.selector ins'), listing);

                // Render filter
                render_filter($content.find('.filter input'), listing);

            },
            cleanup: function() {
                this.$content.empty();
                this.$content.unbind('actionrefresh-smilisting');
            }
        });


    });

})(jQuery, obviel);
