

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
                if (conditions[property].indexOf(item[property]) < 0) {
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


    // Define columns renderers
    var listingcolumns = new obviel.Registry();

    listingcolumns.register({
        name: 'action',
        render: function() {
            var link = $('<a></a>');

            link.text(this.data[this.column.name]);
            link.attr('rel', this.column.action);
            link.attr('href', this.data.path);
            link.bind('click', function(event) {
                this.smi.open_screen_from_link(link);
                return false;
            }.scope(this));
            this.content.empty();
            this.content.append(link);
        }
    });

    listingcolumns.register({
        name: 'text',
        render: function(content, data) {
            content.text(data[this.column.name]);
        }
    });

    listingcolumns.register({
        name: 'icon',
        render: function() {
            var icon = $('<ins class="icon"></ins>');
            var value = this.data[this.column.name];

            if (value.indexOf('.') < 0) {
                icon.addClass(value);
            } else {
                icon.attr(
                    'style',
                    'background:url(' + value + ') no-repeat center center;');
            }
            this.content.empty();
            this.content.append(icon);
        }
    });

    listingcolumns.register({
        name: 'workflow',
        render: function() {
            var icon = $('<ins class="state"></ins>');
            var value = this.data[this.column.name];

            if (value) {
                icon.addClass(value);
            }
            this.content.empty();
            this.content.append(icon);
        }
    });

    // For action.smilisting add a clear selection action
    obviel.view({
        iface: 'content',
        name: 'action.smilisting',
        order: 0,
        render: function() {
            var html = $('<li><a class="close-selection ui-state-default" title="close selection">' +
                         '<ins class="ui-icon ui-icon-closethick"></ins></a></li>');
            var link = html.children('a');

            link.bind('click', function() {
                this.data.close();
            }.scope(this));
            this.content.append(html);
        }
    });

    // Display a element in the clipboard
    obviel.view({
        iface: 'content',
        name: 'clipboarditem.smilisting',
        render: function() {
            var item = $('<li class="clipboard-item"></li>');

            item.addClass(this.state);
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

            this.content.append(item);
        }
    });


    /**
     * Register action buttons in obviel given the configuration.
     * @param action_defintions: describe action (title, icon, what to do...)
     * @param url_template: base URL to use for REST-type actions
     * @param name: name used to register actions in obviel
     */
    var register_action_buttons = function(action_definitions, url_template, name) {
        $.each(action_definitions, function(i, action) {
            var definition = {
                ifaces: action.ifaces,
                name: name,
                order: action.order,
                render: function() {
                    var html = $('<li><a class="action ui-state-default"></a></li>');
                    var link = html.children('a');

                    if (action.title) {
                        link.text(action.title);
                    };
                    if (action.icon) {
                        link.prepend(
                            '<ins class=" ui-icon  ui-icon-' +
                                action.icon +
                                '"></ins>');
                    };
                    if (this.action != undefined) {
                        link.bind('click', function() {
                            this.action();
                        }.scope(this));
                    };
                    this.content.append(html);
                }
            };
            if (action.available) {
                var conditions = [];

                for (var limiter in action.available) {
                    switch(limiter) {
                    case 'max_items':
                        conditions.push(function() {
                            return this.data.length() <= action.available.max_items;
                        });
                        break;
                    case 'min_items':
                        conditions.push(function() {
                            return this.data.length() >= action.available.min_items;
                        });
                        break;
                    case 'items_match':
                        conditions.push(function() {
                            return objects_match(this.data.items(), action.available.items_match);
                        });
                        break;
                    case 'content_match':
                        conditions.push(function() {
                            return objects_match([this.data.content], action.available.content_match);
                        });
                        break;
                    };
                };
                definition['available'] = function() {
                    for (var i=0; i < conditions.length; i++) {
                        if (!conditions[i].apply(this)) {
                            return false;
                        };
                    };
                    return true;
                };
            };
            for (var action_type in action.action) {
                switch(action_type) {
                case 'rest':
                    definition['action'] = function() {
                        var url = url_template.expand({
                            path: this.smi.opened.path,
                            action: action.action.rest.action});
                        var payload = [];
                        switch(action.action.rest.send) {
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
                        }
                        $.ajax({
                            url: url,
                            type: 'POST',
                            dataType: 'json',
                            data: payload,
                            success: function(result) {
                                for (var post_action in result.post_actions) {
                                    switch(post_action) {
                                    case 'remove':
                                        this.data.remove(result.post_actions.remove);
                                        break;
                                    case 'update':
                                        var need_refresh = this.data.update(result.post_actions.update);
                                        // The update of the data might have trigger some data changes
                                        // in the selection.
                                        if (need_refresh) {
                                            this.content.triggerHandler(
                                                'actionrefresh-smilisting', {data: this.data});
                                        };
                                        break;
                                    case 'new_data':
                                        this.content.trigger('newdata-smilisting', result.post_actions.new_data);
                                        break;
                                    case 'clear_clipboard':
                                        this.smi.clipboard.clear(true);
                                        break;
                                    };
                                };
                                if (result.notifications) {
                                    this.smi.notifications.notifies(result.notifications);
                                };
                            }.scope(this)
                        });
                    };
                    break;
                case 'cut':
                    definition['action'] = function () {
                        this.smi.clipboard.cut(this.data.data);
                    };
                    break;
                case 'copy':
                    definition['action'] = function () {
                        this.smi.clipboard.copy(this.data.data);
                    };
                    break;
                case 'clear_clipboard':
                    definition['action'] = function() {
                        this.smi.clipboard.clear();
                    };
                };
            };
            obviel.view(definition);
        });
    };

    /**
     * Manage a selector that can unselect / select all
     * element in a listing, and view selection status.
     * @param listing: managed listing
     */
    var SMIMultiSelector = function(listing) {
        this.$selector = listing.$header.find('.selector');
        this.status = 'none';
        this.listing = listing;

        // Hide selector if the header is hidden.
        this.listing.$header.bind('collapsingchange-smilisting', function() {
            this.$selector.fadeToggle();
        }.scope(this));
        if (this.listing.$header.is('.collapsed')) {
            this.$selector.hide();
        };

        // Update selector on selection change
        this.listing.$container.bind('selectionchange-smilisting', function(event, changes) {
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
    var SMIViewClipboard = function(container, smi) {
        this.smi = smi;
        var content = container.find('.clipboard-info');
        this.$popup = content.children('.popup');
        this._uptodate = false;
        var info = content.children('.stat');
        var count = info.find('.count');

        // Set default clipboard count on creation
        count.text(smi.clipboard.length().toString());

        // Update count when clipboard is changed
        $('body').bind('contentchange-smiclipboard', function() {
            count.text(smi.clipboard.length().toString());
            if (this.$popup.is(':visible')) {
                this.update();
            } else {
                this._uptodate = false;
            };
        }.scope(this));

        // Show actions when you click on the info.
        info.bind('click', function() {
            this.toggle();
            return false;
        }.scope(this));
        this.$popup.bind('mouseleave', function() {
            this.$popup.fadeOut();
        }.scope(this));
    };

    SMIViewClipboard.prototype.toggle = function() {
        if (!this._uptodate && !this.$popup.is(':visible')) {
            this.update();
        };
        this.$popup.fadeToggle();
    };

    SMIViewClipboard.prototype.hide = function() {
        this.$popup.fadeOut();
    };

    SMIViewClipboard.prototype.update = function() {
        var popup = this.$popup;

        popup.empty();
        $.each(this.smi.clipboard.cutted, function(i, item) {
            popup.render({
                data: item,
                name: 'clipboarditem.smilisting',
                extra: {state: 'cutted'}});
        });
        $.each(this.smi.clipboard.copied, function(i, item) {
            popup.render({
                data: item,
                name: 'clipboarditem.smilisting',
                extra: {state: 'copied'}});
        });
        popup.render({
            every: this.smi.clipboard,
            name: 'clipboardaction.smilisting',
            extra: {smi: this.smi}});
        this._uptodate = true;
    };

    /**
     * Manage item (and selected item) counter for a listing.
     * @param listing: associated listing.
     */
    var SMIViewCounter = function(listing) {
        this.listing = listing;
        this.$counter = $('p.' + this.listing.name);
        this.$total = this.$counter.find('span.total');
        this.$selected = this.$counter.find('span.selected');
        this.$selected.hide();

        // Hide counter on header collapse
        this.listing.$header.bind('collapsingchange-smilisting', function() {
            this.$counter.toggle();
        }.scope(this));

        // Bind selection change event
        this.listing.$container.bind('selectionchange-smilisting', function(event, changes) {
            if (changes.selected) {
                this.$selected.find('.count').text(changes.selected.toString());
                this.$selected.show();
            } else {
                this.$selected.hide();
            };
        }.scope(this));

        // Bind content change event
        this.listing.$container.bind('contentchange-smilisting', function(event, changes) {
            if (changes.total) {
                this.$total.find('.count').text(changes.total.toString());
                this.$total.show();
            } else {
                this.$total.hide();
            };
        }.scope(this));
    };

    /**
     * Represent a selection of multiple items in a listing.
     * @param items: selected rows (must have the .item class).
     */
    var SMISelection = function(listing, items) {
        this.listing = listing;
        this.content = listing.content;

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
                if (this.ifaces.indexOf(local_data.ifaces[e]) < 0) {
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


    /**
     * Manage action buttons on selected items of a listing.
     * @param listing: associated listing.
     */
    var SMIActions = function(listing) {
        this.listing = listing;

        var render_actions = function(selection, cell) {
            if (!(selection instanceof SMISelection)) {
                selection = new SMISelection(listing, selection);
            };

            cell.render({
                every: selection,
                name: 'action.smilisting',
                extra: {smi: listing.smi}});
        };

        this.listing.$container.bind('selectionchange-smilisting', function(event, changes) {
            // First remove, all action lines that are no longer below
            // a selection
            this.listing.$container.children('tr.actions').each(function (i, item){
                var action = $(item);

                if (!action.prev().is(':selected')) {
                    action.remove();
                };
            });
            var last_selected = this.listing.$container.children('tr.item.selected:first');
            while (last_selected.length) {
                var selected_items = last_selected.nextUntil(':not(.selected)').andSelf();
                last_selected = selected_items.last();
                var next = last_selected.next();

                if (next.is('.actions')) {
                    // Next item is an action line.
                    var next_actions = next.next();
                    if (next_actions.is('.item.selected')) {
                        // The after block is selected, remove the
                        // action line and continue.
                        next.remove();
                        last_selected = next_actions;
                        continue;
                    } else {
                        // The selection might have got bigger from
                        // the top. Rerender actions.
                        render_actions(selected_items, next_actions.find('ol'));
                    };
                } else {
                    // Let's insert an action line here.
                    var action_line = $('<tr class="actions"><td><ol></ol></td></tr>');
                    var action_cell = action_line.children('td');
                    var actions = action_cell.children('ol');

                    action_cell.attr('colspan', this.listing.configuration.columns.length);
                    render_actions(selected_items, actions);
                    actions.bind('actionrefresh-smilisting', function(event, data) {
                        // If an action is executed, rerender the action line.
                        var actions = $(this);

                        actions.empty();
                        render_actions(data.data, actions);
                    });
                    last_selected.after(action_line);
                };
                var following = next.nextUntil('.selected');
                if (!following.length) {
                    following = next;
                }
                last_selected = following.last().next();
            };
        }.scope(this));
    };

    var SMIListing = function(name, smi, data, content, configuration) {
        var $content = $('dd.' + name);
        var $container = $content.find('tbody');
        this.name = name;
        this.$header = $('dt.' + name);
        this.$container = $container;
        this.content = content;
        this.configuration = configuration;
        this.smi = smi;

        this.selector = new SMIMultiSelector(this);
        this.actions = new SMIActions(this);
        this.counter = new SMIViewCounter(this);

        this.smi.shortcuts.new_shortcuts(name, $content);

        // Collapse feature
        {
            var $marker = this.$header.children('ins.ui-icon');
            var $header = this.$header;
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
            this.$header.bind('click', function() {
                toggle_collapsing();
            });
            $content.bind('focus-smi', function() {
                if ($header.hasClass('collapsed')) {
                    toggle_collapsing();
                };
                $content.parent().scrollTop(
                    $content.position().top - $header.outerHeight());
            });
        };

        // Add the hover style
        this.$container.delegate('tr.item', 'mouseenter', function() {
            $(this).addClass("hover");
        });
        this.$container.delegate('tr.item', 'mouseleave', function() {
            $(this).removeClass("hover");
        });

        // Row selection with mouse
        var mouse_last_selected = null;
        var trigger = this.trigger.scope(this);
        this.$container.delegate('tr.item', 'click', function(event) {
            var row = $(this);

            if (mouse_last_selected === null || !event.shiftKey) {
                mouse_last_selected = row.index();
                row.toggleClass('selected');
                trigger('selectionchange-smilisting');
            } else {
                // Shift is pressed, and a column have been previously selected.
                var current_selected = row.index();

                if (current_selected != mouse_last_selected) {
                    var start = 0;
                    var end = 0;

                    if (current_selected > mouse_last_selected) {
                        start = mouse_last_selected + 1;
                        end = current_selected + 1;
                    } else {
                        start = current_selected;
                        end = mouse_last_selected;
                    };
                    row.parent().children().slice(start, end).toggleClass('selected');
                    trigger('selectionchange-smilisting');
                };
                mouse_last_selected = current_selected;
            };
        });

        if (this.configuration.sortable) {
            var table = $content.find('table');

            // Add the sorting if the table is sortable
            table.tableDnD({
                dragHandle: "moveable",
                onDragClass: "dragging",
                onDragStart: function(table, row) {
                    // Reset hover style and mouse mouse_last_selected
                    $(row).removeClass('hover');
                    mouse_last_selected = null;
                    $(table).removeClass('static');
                },
                onDrop: function(table, row) {
                    // XXX Send new order to server
                    $(table).addClass('static');
                    this.trigger('selectionchange-smilisting');
                }.scope(this)
            });
            // If content change, reinitialize the DND
            $content.bind('contentchange-smilisting', function() {
                table.tableDnDUpdate();
            });
        };

        // Add default data
        this.new_lines(data, true);
    };

    // Called when the listing is cleaned
    SMIListing.prototype.cleanup = function() {
        this.smi.shortcuts.remove_shortcuts(this.name);
    };

    /**
     * Trigger an event on the listing data.
     * @param event_name: name of the event to trigger
     */
    SMIListing.prototype.trigger = function(event_name) {
        var total = this.$container.children('tr.item').length;
        var selected = this.$container.children('tr.item.selected').length;

        this.$container.trigger(event_name, {total: total, selected: selected});
    };

    /**
     * Add a list of lines later on.
     */
    SMIListing.prototype.new_lines = function(data, initial) {
        if (this.$header.is('.collapsed')) {
            this.$header.one('collapsingchange-smilisting', function() {
                // On first next display, add the data.
                this.add_lines(data, initial);
            }.scope(this));
        } else {
            this.add_lines(data, initial);
        };
    };

    /**
     * Imediately add a list of lines to the listing.
     * @param data: list of line data
     * @param initial: is it the initial adding.
     *
     * In case of initial adding, if there is no data, an empty line
     * will be added. Otherwise, eventual empty line will removed,
     * added lines will be selected.
     */
    SMIListing.prototype.add_lines = function(data, initial) {
        if (data.length) {
            if (!initial) {
                // Remove any eventual empty line
                this.$container.children('.empty').remove();
            };
            // Fill in table
            $.each(data, function(i, line) {
                this.add_line(line, !initial);
            }.scope(this));
            // Send events
            this.trigger('contentchange-smilisting');
            if (!initial) {
                this.trigger('selectionchange-smilisting');
            };
        } else if (initial) {
            // Add a message no lines.
            // XXX should come from a template, i18n
            var empty_line = $('<tr class="empty"></tr>');
            var empty_cell = $('<td>There is no items here.</td>');

            empty_cell.attr('colspan', this.configuration.columns.length);
            empty_line.append(empty_cell);
            this.$container.append(empty_line);
        };
        this.trigger('contentchange-smilisting');
    };

    /**
     * Add one line to the listing.
     * @param data: line data.
     * @param selected: should the added line be selected (doesn't
     *        trigger the selectionchange-smilisting event).
     */
    SMIListing.prototype.add_line = function(data, selected) {
        // Add a data line to the table
        var line = $('<tr class="item"></tr>');

        $.each(this.configuration.columns, function(i, column) {
            var cell = $('<td></td>');

            if (!i) {
                cell.addClass('first');
            };
            if (this.configuration.sortable &&
                this.configuration.sortable.columns.indexOf(column.name) >= 0) {
                cell.addClass('moveable');
            };
            listingcolumns.render(cell, {
                data: data,
                name: column.view,
                extra: {smi: this.smi,
                        column: column}});
            line.append(cell);
        }.scope(this));
        if (selected) {
            line.addClass('selected');
        };
        line.attr('id', 'list' + data['id'].toString());
        line.data('smilisting', data);
        this.$container.append(line);
    };

    /**
     * Return the line associated to the given id.
     * @param id: line id
     */
    SMIListing.prototype.get_line = function(id) {
        return this.$container.children('#list' + id.toString());
    };

    /**
     * Update a list of lines.
     * @param data: list of data for each line to update.
     */
    SMIListing.prototype.update_lines = function(data) {
        $.each(data, function(i, line) {
            this.update_line(line['id'], line);
        }.scope(this));
    };

    /**
     * Update a line with more recent data.
     * @param id: line id to update
     * @param data: data to update the line with
     */
    SMIListing.prototype.update_line = function(id, data) {
        var line = this.get_line(id);

        line.children().each(function(i, content) {
            var cell = $(content);
            var column = this.configuration.columns[i];

            if (this.configuration.sortable &&
                this.configuration.sortable.columns.indexOf(column.name) >= 0) {
                cell.addClass('moveable');
            };
            listingcolumns.render(cell, {
                data: data,
                name: column.view,
                extra: {smi: this.smi,
                        column: column}});
        }.scope(this));
        line.data('smilisting', data);
    };

    /**
     * Remove a list of lines.
     * @param ids: list of id of lines to remove.
     */
    SMIListing.prototype.remove_lines = function(ids) {
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
    };

    /**
     * Unselect the given items.
     * @param items: items to unselect.
     */
    SMIListing.prototype.unselect = function(items) {
        items.removeClass('selected');
        this.trigger('selectionchange-smilisting');
    };

    /**
     * Unselect all elements.
     */
    SMIListing.prototype.unselect_all = function() {
        this.unselect(this.$container.children('tr.item.selected'));
    };

    /**
     * Select all elements.
     */
    SMIListing.prototype.select_all = function() {
        this.$container.children('tr.item').addClass('selected');
        this.trigger('selectionchange-smilisting');
    };

    $(document).bind('load-smiplugins', function(event, smi) {
        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
                var action_url = jsontemplate.Template(smi.options.listing.action, {});
                register_action_buttons(
                    configuration.actions,
                    action_url,
                    'action.smilisting');
                register_action_buttons(
                    configuration.clipboard_actions,
                    action_url,
                    'clipboardaction.smilisting');

                obviel.view({
                    iface: 'listing',
                    name: 'content',
                    html_url: smi.options.listing.template,
                    init: function() {
                        this.configuration = configuration;
                        this.listings = [];
                    },
                    render: function() {
                        // Disable text selection
                        this.content.disableTextSelect();

                        // Bind clipboard info
                        this.smi.clipboard.content = this.data.content;
                        var clipboard_info = new SMIViewClipboard(this.content, this.smi);

                        // Fill in header
                        var first_cfg = configuration.listing[0];
                        var header = this.content.find('div.header tr');
                        $.each(first_cfg.columns, function(i, column) {
                            var cell = $('<th></th>');

                            if (!i) {
                                cell.addClass('ui-state-default');
                                cell.append('<ins class="ui-icon ui-icon-triangle-2-n-s"></ins>');
                            };
                            if (column.caption) {
                                cell.text(column.caption);
                            };
                            header.append(cell);
                        });

                        $.each(this.configuration.listing, function(i, configuration) {
                            var listing = new SMIListing(
                                configuration.name,
                                this.smi,
                                this.data.items[configuration.name],
                                this.data.content,
                                configuration);

                            this.listings.push(listing);
                        }.scope(this));

                        this.content.bind('newdata-smilisting', function(event, data) {
                            $.each(this.listings, function(i, listing) {
                                var lines = data[listing.name];

                                if (lines && lines.length)  {
                                    listing.new_lines(lines);
                                };
                            });
                        }.scope(this));

                        // Bind and update the listing column sizes
                        this.update_listing_sizes();
                        this.content.bind('collapsingchange-smilisting', function() {
                            this.update_listing_sizes();
                        }.scope(this));
                    },
                    update_listing_sizes: function() {
                        var $header = this.content.find('div.header table');
                        var $reference = null;
                        var configuration = null;
                        var others = [];
                        var other_configurations = [];

                        for (var l=0; l < this.listings.length; l++) {
                            var listing = this.listings[l];
                            var $table = listing.$container.parent();
                            if ($table.is(':visible')) {
                                if ($reference === null) {
                                    $reference = $table;
                                    configuration = listing.configuration.layout;
                                } else {
                                    others.push($table);
                                    other_configurations.push(listing.configuration.layout);
                                };
                            };
                        };

                        if ($reference !== null) {
                            $reference.updateTableColumnsWidths(configuration);
                            $header.updateTableColumnsWidths({}, $reference);

                            for (var i=0; i < others.length; i++) {
                                others[i].updateTableColumnsWidths(other_configurations[i], $reference);
                            };
                        };
                    },
                    cleanup: function() {
                        $.each(this.listings, function(i, listing) {
                            listing.cleanup();
                        });
                        this.smi.clipboard.content = null;
                        this.content.empty();
                        this.content.enableTextSelect();
                        this.content.unbind('newdata-smilisting');
                        this.content.unbind('collapsingchange-smilisting');
                    }
                });

            }});
    });

})(jQuery, obviel);
