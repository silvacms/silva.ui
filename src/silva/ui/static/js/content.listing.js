

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

    // Define columns renderers
    var listingcolumns = new obviel.Registry();

    listingcolumns.register({
        name: 'action',
        jsont: '<a rel="{column.action|htmltag}" href="{data.path|htmltag}">{value}</a>',
        render: function() {
            var $link = this.$content.children('a');

            $link.bind('click', function(event) {
                this.smi.open_screen_from_link($link);
                return false;
            }.scope(this));
        }
    });

    listingcolumns.register({
        name: 'text',
        jsont: '{value}'
    });

    listingcolumns.register({
        name: 'move',
        html: '...',
        render: function() {
            this.$content.addClass('moveable');
        }
    });

    listingcolumns.register({
        name: 'nothing',
        html: ''
    });

    listingcolumns.register({
        name: 'action-icon',
        jsont: '<a href="{data.path|htmltag}" rel="{column.action|htmltag}" title="{data.title|htmltag}"><ins class="icon"></ins></a>',
        render: function() {
            var $icon = this.$content.find('ins');
            var $link = this.$content.children('a');

            if (this.value.indexOf('.') < 0) {
                $icon.addClass(this.value);
            } else {
                $icon.attr(
                    'style',
                    'background:url(' + this.value + ') no-repeat center center');
            };

            $link.bind('click', function(event) {
                this.smi.open_screen_from_link($link);
                return false;
            }.scope(this));
        }
    });

    listingcolumns.register({
        name: 'workflow',
        html: '<ins class="state"></ins>',
        render: function() {
            if (this.value) {
                this.$content.children('ins').addClass(this.value);
            };
        }
    });

    // Display a element in the clipboard
    obviel.view({
        iface: 'content',
        name: 'clipboarditem.smilisting',
        render: function() {
            var item = $('<li class="clipboard-item '+ this.state + '"></li>');

            if (this.data.title) {
                if (this.data.path) {
                    var link = $('<a class="open-screen"></a>');

                    link.attr('href', this.data.path);
                    link.text(this.data.title);
                    item.append(link);
                } else {
                    item.text(this.data.title);
                };
            };
            if (this.data.icon) {
                var icon = $('<ins class="icon"></icon>');

                if (this.data.icon.indexOf('.') < 0) {
                    icon.addClass(this.data.icon);
                } else {
                    icon.attr(
                        'style',
                        'background:url(' + this.data.icon + ') no-repeat center center;');
                };
                item.prepend(icon);
            };

            this.$content.append(item);
        }
    });

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
                    this.$content.trigger('newdata-smilisting', this.data.post_actions.add);
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
     * @param action_defintions: describe action (title, icon, what to do...)
     * @param url_template: base URL to use for REST-type actions
     * @param name: name used to register actions in obviel
     */
    var build_actions_renderer = function(action_definitions, url_template) {
        var prototypes = [];

        $.each(action_definitions, function(i, action_definition) {
            var definition = {
                order: action_definition.order,
                init: function() {
                    this.collecting = false;
                },
                render: function() {
                    var html = $('<li><a class="action ui-state-default"></a></li>');
                    var link = html.children('a');
                    var is_active = true;

                    if (this.active != undefined && !this.active()) {
                        is_active = false;
                    };
                    if (action_definition.title) {
                        link.text(action_definition.title);
                    };
                    if (action_definition.icon) {
                        link.prepend(
                            '<ins class="ui-icon ui-icon-' +
                                action_definition.icon +
                                '"></ins>');
                    };
                    if (action_definition.accesskey) {
                        link.attr('accesskey', action_definition.accesskey);
                    };
                    if (this.render_children) {
                        var $opener = $('<ins class="ui-icon ui-icon-triangle-1-n"></ins>');
                        var $children = $('<ol class="popup"></ol>');

                        this.render_children($children, this.data, {smi: this.smi});
                        $opener.bind('click', function() {
                            $children.fadeToggle();
                            return false;
                        });
                        link.prepend($opener);
                        link.prepend($children);
                    };
                    if (!is_active) {
                        link.addClass('inactive');
                    }
                    if (is_active && this.action != undefined) {
                        link.bind('click', function() {
                            this.action();
                        }.scope(this));
                    };
                    this.$content.append(html);
                }
            };
            if (action_definition.available) {
                definition['available'] = predicates_evaluator(action_definition.available);
            };
            if (action_definition.active) {
                definition['active'] = predicates_evaluator(action_definition.active);
            };
            if (action_definition.children) {
                definition['render_children'] = build_actions_renderer(
                    action_definition.children, url_template);
            };
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
                };
            };
            prototypes.push(definition);
        });

        prototypes.sort(function (p1, p2) {
            return p1.order - p2.order;
        });

        var Action = function(definition, $content, data, extra) {
            $.extend(this, definition);
            $.extend(this, extra);
            this.$content = $content,
            this.data = data;

            this.init();
        };

        return function($content, data, extra) {
            $.each(prototypes, function() {
                var action = new Action(this, $content, data, extra);
                action.render();
            });
        };
    };

    /**
     * Manage a selector that can unselect / select all
     * element in a listing, and view selection status.
     * @param listing: managed listing
     */
    var SMIMultiSelector = function($selector, listing) {
        this.$selector = $selector;
        this.status = 'none';
        this.listing = listing;

        // Update selector on selection change
        this.listing.$content.bind('selectionchange-smilisting', function(event, changes) {
            if (changes.selected == 0) {
                this.set('none');
            } else if (changes.selected == changes.total) {
                this.set('all');
            } else if (changes.selected == 1) {
                this.set('single');
            } else {
                this.set('partial');
            };
            return false;
        }.scope(this));

        // Clicking on the selector change the selection.
        this.$selector.bind('click', function() {
            if (this.status == 'none') {
                this.listing.select_all();
            } else {
                this.listing.unselect_all();
            };
            return false;
        }.scope(this));
    };

    SMIMultiSelector.prototype.set = function(status) {
        this.$selector.removeClass(this.status);
        this.$selector.addClass(status);
        this.status = status;
    };


    /**
     * View clipboard data.
     * @param container: container containing the info hook.
     */
    var view_clipboard = function($info, smi) {
        var $popup = $info.children('.popup');
        var $detail = $info.children('.detail');
        var $icon = $detail.children('ins');
        var $count = $info.find('.count');
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

    var render_header = function(configuration, $content) {
        var first_configuration = configuration.listing[0];
        var $header = $content.find('div.header tr');
        $.each(first_configuration.columns, function(i, column) {
            var $cell = $('<th></th>');

            if (column.caption) {
                $cell.text(column.caption);
            };
            $header.append($cell);
        });
    };

    $(document).bind('load-smiplugins', function(event, smi) {

        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
                for (var iface in configuration.ifaces) {
                    obviel.iface(iface, configuration.ifaces[iface]);
                };

                $.each(configuration.listing, function(i, lst_configuration) {
                    lst_configuration.column_index = function(name) {
                        for (var i=0; i < this.columns.length; i++) {
                            if (name == this.columns[i].name)
                                return i;
                        };
                        return -1;
                    }.scope(lst_configuration);
                });

                var action_url_template = jsontemplate.Template(smi.options.listing.action, {});
                var render_actions = build_actions_renderer(configuration.actions, action_url_template);

                var create_container = function(name, configuration, data, listing) {
                    var $content = $('dd.' + name);
                    var $container = $content.find('tbody');

                    // Collapse feature / table header.
                    (function() {
                        var $header = $('dt.' + name);;
                        var $marker = $header.children('ins.ui-icon');

                        var toggle_marker = function() {
                            // Update the jQueryUI class on the marker (would be
                            // too easy otherwise).
                            if ($marker.hasClass('ui-icon-triangle-1-e')) {
                                $marker.removeClass('ui-icon-triangle-1-e');
                                $marker.addClass('ui-icon-triangle-1-s');
                            } else {
                                $marker.removeClass('ui-icon-triangle-1-s');
                                $marker.addClass('ui-icon-triangle-1-e');
                            };
                        };
                        var toggle_collapsing = function () {
                            toggle_marker();
                            $header.toggleClass('collapsed');
                            $content.toggleClass('collapsed');
                            configuration.collapsed = !configuration.collapsed;
                            $header.trigger('collapsingchange-smilisting');
                        };

                        if (configuration.collapsed) {
                            toggle_marker();
                            $header.addClass('collapsed');
                            $content.addClass('collapsed');
                            $header.trigger('collapsingchange-smilisting');
                        };
                        $header.bind('click', function(event) {
                            var target = $(event.target);
                            if (target.is('input')) {
                                target.focus();
                                return;
                            };
                            toggle_collapsing();
                            return false;
                        });
                        $content.bind('focus-smi', function() {
                            if ($header.hasClass('collapsed')) {
                                toggle_collapsing();
                            };
                            $content.parent().SMISmoothScroll(
                                'slow', 'absolute',
                                $content.position().top - $header.outerHeight());
                        });
                    })();

                    var trigger = function(event_name) {
                        listing.trigger(event_name, $container);
                    };

                    (function() {
                        // Row selection
                        var last_selected_index = null;
                        var hovered_row = null;

                        var get_hovered_row = function() {
                            if (hovered_row === null) {
                                hovered_row = $container.children('tr.item:first');
                                hovered_row.addClass("hover");
                            };
                            return hovered_row;
                        };
                        var clear_hovered_row = function() {
                            if (hovered_row !== null) {
                                hovered_row.removeClass("hover");
                            };
                            hovered_row = null;
                        };
                        var set_hovered_row = function(row) {
                            if (row.length) {
                                clear_hovered_row();
                                hovered_row = row;
                                hovered_row.addClass("hover");
                            };
                        };
                        var select_row = function(row, multiple) {
                            if (last_selected_index === null || !multiple) {
                                last_selected_index = row.index();
                                row.toggleClass('selected');
                                trigger('selectionchange-smilisting');
                            } else {
                                // Multiple selection
                                var current_index = row.index();

                                if (current_index != last_selected_index) {
                                    var start = 0;
                                    var end = 0;

                                    if (current_index > last_selected_index) {
                                        start = last_selected_index + 1;
                                        end = current_index + 1;
                                    } else {
                                        start = current_index;
                                        end = last_selected_index;
                                    };
                                    row.parent().children().slice(start, end).filter('.item').toggleClass('selected');
                                    trigger('selectionchange-smilisting');
                                };
                                last_selected_index = current_index;
                            };
                        };

                        // Set the hover column on hovering
                        $container.delegate('tr.item', 'mouseenter', function() {
                            set_hovered_row($(this));
                        });
                        $container.delegate('tr.item', 'mouseleave', function() {
                            clear_hovered_row();
                        });

                        // Row selection with mouse
                        $container.delegate('tr.item', 'click', function(event) {
                            var target = $(event.target);
                            if (target.is('input[type="text"]')) {
                                target.focus();
                                return;
                            };
                            select_row($(this), event.shiftKey);
                        });

                        if (configuration.sortable) {
                            if (objects_match([listing.data.content], configuration.sortable.available)) {
                                var table = $content.find('table');

                                // Add the sorting if the table is sortable
                                table.tableDnD({
                                    dragHandle: "moveable",
                                    onDragClass: "dragging",
                                    onDragStart: function(table, row) {
                                        // Reset hover style and mouse last_selected_index
                                        last_selected_index = null;
                                        $(table).removeClass('static');
                                    },
                                    onDrop: function(table, row) {
                                        var $line = $(row);
                                        var data = $line.data('smilisting');

                                        $.ajax({
                                            url: action_url_template.expand({
                                                path: listing.smi.opened.path,
                                                action: configuration.sortable.action}),
                                            type: 'POST',
                                            dataType: 'json',
                                            data: [{name: 'content', value: data['id']},
                                                   {name: 'position', value: $line.index() - 1}],
                                            success: function(data) {
                                                if (data.notifications) {
                                                    listing.smi.notifications.notifies(data.notifications);
                                                };
                                            }
                                        });

                                        $(table).addClass('static');
                                    }
                                });
                                // If content change, reinitialize the DND
                                $content.bind('contentchange-smilisting', function() {
                                    table.tableDnDUpdate();
                                });
                            };
                        };
                    })();

                    var add_lines = function(datas, initial) {
                        if (datas.length) {
                            if (!initial) {
                                // Remove any eventual empty line
                                $container.children('.empty').remove();
                            };
                            // Fill in table
                            $.each(datas, function(i, data) {
                                // Add a data line to the table
                                var $line = $('<tr class="item"></tr>');

                                $.each(configuration.columns, function(e, column) {
                                    var $cell = $('<td></td>');
                                    $cell.bind('updatecell-smilisting', function(event, data) {
                                        listingcolumns.render($(this), {
                                            data: data,
                                            name: column.view,
                                            ifaces: ['object'],
                                            extra: {smi: listing.smi,
                                                    column: column,
                                                    value: data[column.name]}});
                                        event.stopPropagation();
                                        event.preventDefault();
                                    });
                                    $line.append($cell);
                                });
                                if (!initial) {
                                    $line.addClass('selected');
                                };
                                $line.attr('id', 'list' + data['id'].toString());
                                $line.bind('updateline-smilisting', function(event, data) {
                                    $line.children().trigger('updatecell-smilisting', data);
                                    $line.removeClass('inputized');
                                    $line.data('smilisting', data);
                                    event.stopPropagation();
                                    event.preventDefault();
                                });
                                $line.bind('inputline-smilisting', function(event, data) {
                                    var tabindex = data.names.length * $line.index() + 1;
                                    $.each(data.names, function(e, name) {
                                        var index = configuration.column_index(name);
                                        var data = $line.data('smilisting')[name];
                                        var $cell = $line.children(':eq(' + index + ')');
                                        var $input = $('<input type="text" />');

                                        $input.attr('tabindex', tabindex);
                                        tabindex += 1;
                                        $input.val(data);
                                        $cell.empty();
                                        $cell.append($input);
                                    });
                                    $line.addClass('inputized');
                                    event.stopPropagation();
                                    event.preventDefault();
                                });
                                $container.append($line);
                                $line.trigger('updateline-smilisting', data);
                            });
                            // Send events
                            trigger('contentchange-smilisting');
                            if (!initial) {
                                trigger('selectionchange-smilisting');
                            };
                        } else if (initial) {
                            // Add a message no lines.
                            var $empty_line = $('<tr class="empty"></tr>');
                            var $empty_cell = $('<td>There is no items here.</td>');

                            $empty_cell.attr('colspan', configuration.columns.length);
                            $empty_line.append($empty_cell);
                            $container.append($empty_line);
                        };
                    };

                    // Add default data
                    add_lines(data, true);
                    $container.bind('addline-smilisting', function(event, data) {
                        add_lines(data.lines, false);
                        event.stopPropagation();
                        event.preventDefault();
                    });
                    return $container;
                };

                obviel.view({
                    iface: 'listing',
                    name: 'content',
                    html_url: smi.options.listing.template,
                    init: function() {
                        this.configuration = configuration;
                        this.$containers = $([]);
                        this.by_name = {};
                    },
                    get_line: function(id) {
                        return this.$containers.children('#list' + id.toString());
                    },
                    update_lines: function(datas) {
                        var get_line = this.get_line.scope(this);

                        $.each(datas, function(i, data) {
                            get_line(data['id']).trigger('updateline-smilisting', data);
                        });
                    },
                    remove_lines: function(ids) {
                        var is_selection_changed = false;
                        var is_content_changed = false;

                        $.each(ids, function(i, id) {
                            var line = this.get_line(id);

                            if (line.length) {
                                if (line.is('.selected')) {
                                    is_selection_changed = true;
                                };
                                is_content_changed = true;
                                line.remove();
                            };
                        }.scope(this));
                        if (is_content_changed) {
                            this.trigger('contentchange-smilisting');
                        };
                        if (is_selection_changed) {
                            this.trigger('selectionchange-smilisting');
                        };
                    },
                    unselect: function($lines) {
                        $lines.filter('.inputized').each(function(i, line) {
                            var $line = $(line);
                            this.update_line($line, $line.data('smilisting'));
                        }.scope(this));
                        $lines.removeClass('selected');
                        this.trigger('selectionchange-smilisting');
                    },
                    unselect_all: function() {
                        this.unselect(this.$containers.children('tr.item.selected'));
                    },
                    select_all: function() {
                        this.$containers.children('tr.item').addClass('selected');
                        this.trigger('selectionchange-smilisting');
                    },
                    trigger: function(event_name, $content) {
                        var total = this.$containers.children('tr.item').length;
                        var items = this.$containers.children('tr.item.selected');

                        if ($content === undefined) {
                            $content = this.$content;
                        }
                        $content.trigger(event_name, {
                            total: total,
                            selected: items.length,
                            items: items
                        });
                    },
                    render: function() {
                        // Disable text selection
                        this.$content.disableTextSelect();

                        // Clipboard info
                        this.smi.clipboard.content = this.data.content;
                        view_clipboard(this.$content.find('.clipboard-info'), this.smi);

                        // Multi selector
                        new SMIMultiSelector(this.$content.find('.header .selector'), this);

                        // Render header
                        render_header(this.configuration, this.$content);

                        $.each(this.configuration.listing, function(i, configuration) {
                            var container = create_container(
                                configuration.name,
                                configuration,
                                this.data.items[configuration.name],
                                this);
                            this.$containers = this.$containers.add(container);
                            this.by_name[configuration.name] = container;
                        }.scope(this));

                        // Render actions
                        var $actions = this.$content.find('.header .actions');
                        render_actions(
                            $actions,
                            new SMISelection(this, this.data.content, $([])),
                            {smi: this.smi});
                        this.$content.bind('selectionchange-smilisting', function(event, changes) {
                            $actions.empty();
                            render_actions(
                                $actions,
                                new SMISelection(this, this.data.content, changes.items),
                                {smi: this.smi});
                        }.scope(this));
                        this.$content.bind('actionrefresh-smilisting', function(event, data) {
                            $actions.empty();
                            render_actions($actions, data.data, {smi: this.smi});
                            event.stopPropagation();
                            event.preventDefault();
                        }.scope(this));

                        // Handle new data added to the listing
                        this.$content.bind('newdata-smilisting', function(event, data) {
                            for (var name in this.by_name) {
                                var lines = data[name];

                                if (lines && lines.length) {
                                    this.by_name[name].trigger('addline-smilisting', {lines: lines});
                                };
                            };
                        }.scope(this));

                        // Bind and update the listing column sizes
                        this.update_widths();
                        this.$content.bind('collapsingchange-smilisting', function() {
                            this.update_widths();
                        }.scope(this));
                    },
                    update_widths: function() {
                        var $containers = this.by_name;
                        var $header = this.$content.find('div.header table');
                        var $reference = null;
                        var layout = null;
                        var others = [];
                        var other_layouts = [];

                        $.each(this.configuration.listing, function(i, configuration) {
                            var $table = $containers[configuration.name].parent();
                            if ($table.is(':visible')) {
                                if ($reference === null) {
                                    $reference = $table;
                                    layout = configuration.layout;
                                } else {
                                    others.push($table);
                                    other_layouts.push(configuration.layout);
                                };
                            };
                        });

                        if ($reference !== null) {
                            $reference.updateTableColumnsWidths(layout);
                            $header.updateTableColumnsWidths({}, $reference);

                            for (var i=0; i < others.length; i++) {
                                others[i].updateTableColumnsWidths(other_layouts[i], $reference);
                            };
                        };
                    },
                    cleanup: function() {
                        this.smi.clipboard.content = null;
                        this.$content.empty();
                        this.$content.enableTextSelect();
                        this.$content.unbind('newdata-smilisting');
                        this.$content.unbind('collapsingchange-smilisting');
                        this.$content.unbind('selectionchange-smilisting');
                        this.$content.unbind('actionrefresh-smilisting');
                    }
                });

            }});
    });

})(jQuery, obviel);
