

(function($, obviel) {

    // Define columns renderers
    var listingcolumns = new obviel.Registry();

    listingcolumns.register({
        name: 'action',
        render: function() {
            var link = $('<a class="content-screen"></a>');

            link.text(this.data[this.column.name]);
            link.attr('rel', this.column.action);
            link.attr('href', this.data.path);
            link.bind('click', function(event) {
                this.smi.open_link(link);
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
            var link = $('<a class="close-selection ui-state-default" title="close selection">' +
                         '<ins class="ui-icon ui-icon-closethick"></ins></a>');
            link.bind('click', function() {
                this.data.close();
            }.scope(this));
            this.content.append(link);
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
            $.each(action.ifaces, function (e, iface) {
                var definition = {
                    iface: iface,
                    name: name,
                    order: action.order,
                    render: function() {
                        var link = $('<a class="action ui-state-default"></a>');

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
                        this.content.append(link);
                    }
                };
                for (var limiter in action.available) {
                    switch(limiter) {
                    case 'max_items':
                        definition['available'] = function() {
                            return this.data.length() <= action.available.max_items;
                        };
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
                                $.each(this.data.data, function(i, item) {
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
                                            this.data.update(result.post_actions.update);
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
        });
    };

    /**
     * Manage a selector that can unselect / select all
     * element in a listing, and view selection status.
     * @param listing: managed listing
     */
    var SMIMultiSelector = function(listing) {
        this.selector = listing.header.find('.selector');
        this.status = 'none';
        this.listing = listing;

        // Hide selector if the header is hidden.
        this.listing.header.bind('collapsingchange-smilisting', function() {
            this.selector.fadeToggle();
        }.scope(this));
        if (this.listing.header.is('.collapsed')) {
            this.selector.hide();
        };

        // Update selector on selection change
        this.listing.container.bind('selectionchange-smilisting', function(event, changes) {
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
        this.selector.bind('click', function() {
            if (this.status == 'none') {
                this.listing.select_all();
            } else {
                this.listing.unselect_all();
            };
            return false;
        }.scope(this));
    };

    SMIMultiSelector.prototype.set = function(status) {
        this.selector.removeClass(this.status);
        this.selector.addClass(status);
        this.status = status;
    };

    /**
     * View clipboard data.
     * @param container: container containing the info hook.
     */
    var SMIViewClipboard = function(container, smi) {
        var content = container.find('.clipboard-info');
        var actions = content.children('.actions');
        var info = content.children('.stat');
        var count = info.find('.count');

        // Set default clipboard count on creation
        count.text(smi.clipboard.length().toString());

        // Render actions
        actions.children('li:first').render({
            every: smi.clipboard,
            name: 'clipboardaction.smilisting',
            extra: {smi: smi}});


        // Update count when clipboard is changed
        $('body').bind('contentchange-smiclipboard', function() {
            count.text(smi.clipboard.length().toString());
        });

        // Show actions when you click on the info.
        info.bind('click', function() {
            actions.fadeToggle();
            return false;
        });
        actions.bind('mouseleave', function() {
            actions.fadeOut();
        });
    };

    /**
     * Manage item (and selected item) counter for a listing.
     * @param listing: associated listing.
     */
    var SMIViewCounter = function(listing) {
        this.listing = listing;
        this.counter = $('p.' + this.listing.name);
        this.total = this.counter.find('span.total');
        this.selected = this.counter.find('span.selected');
        this.selected.hide();

        // Hide counter on header collapse
        this.listing.header.bind('collapsingchange-smilisting', function() {
            this.counter.toggle();
        }.scope(this));

        // Bind selection change event
        this.listing.container.bind('selectionchange-smilisting', function(event, changes) {
            if (changes.selected) {
                this.selected.find('.count').text(changes.selected.toString());
                this.selected.show();
            } else {
                this.selected.hide();
            };
        }.scope(this));

        // Bind content change event
        this.listing.container.bind('contentchange-smilisting', function(event, changes) {
            if (changes.total) {
                this.total.find('.count').text(changes.total.toString());
                this.total.show();
            } else {
                this.total.hide();
            };
        }.scope(this));
    };

    /**
     * Represent a selection of multiple items in a listing.
     * @param items: selected rows (must have the .item class).
     */
    var SMISelection = function(listing, items) {
        this.listing = listing;
        this.items = items;

        this.ifaces = [];
        this.data = [];

        $.each(this.items, function (i, item) {
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
     * Return the size of the selection
     */
    SMISelection.prototype.length = function() {
        return this.items.length;
    };

    /**
     * Update some selected items.
     */
    SMISelection.prototype.update = function(items) {
        this.listing.update_lines(items);
    };

    /**
     * Remove some items associated to the selection
     */
    SMISelection.prototype.remove = function(items) {
        this.listing.remove_lines(items);
    };

    /**
     * Close the current selection (unselect it).
     */
    SMISelection.prototype.close = function() {
        this.listing.unselect(this.items);
    };

    /**
     * Manage action buttons on selected items of a listing.
     * @param listing: associated listing.
     */
    var SMIActions = function(listing) {
        this.listing = listing;

        var render_actions = function(items, cell) {
            var selection = new SMISelection(listing, items);

            cell.render({
                every: selection,
                name: 'action.smilisting',
                extra: {smi: listing.smi}});
        };

        this.listing.container.bind('selectionchange-smilisting', function(event, changes) {
            // First remove, all action lines that are no longer below
            // a selection
            this.listing.container.children('tr.actions').each(function (i, item){
                var action = $(item);

                if (!action.prev().is(':selected')) {
                    action.remove();
                };
            });
            var last_selected = this.listing.container.children('tr.item.selected:first');
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
                        render_actions(selected_items, next_actions.find('td'));
                    };
                } else {
                    // Let's insert an action line here.
                    var action_line = $('<tr class="actions"></tr>');
                    var action_cell = $('<td></td>');

                    render_actions(selected_items, action_cell);
                    action_cell.attr('colspan', this.listing.configuration.columns.length);
                    action_line.append(action_cell);
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

    var SMIListing = function(name, smi, data, configuration) {
        var content = $('dd.' + name);
        var container = content.find('tbody');
        this.name = name;
        this.header = $('dt.' + name);
        this.container = container;
        this.configuration = configuration;
        this.smi = smi;

        this.selector = new SMIMultiSelector(this);
        this.actions = new SMIActions(this);
        this.counter = new SMIViewCounter(this);

        // Collapse feature
        if (configuration.collapsed) {
            this.header.addClass('collapsed');
            content.addClass('collapsed');
            this.header.trigger('collapsingchange-smilisting');
        };
        this.header.bind('click', function() {
            this.header.toggleClass('collapsed');
            content.toggleClass('collapsed');
            configuration.collapsed = !configuration.collapsed;
            this.header.trigger('collapsingchange-smilisting');
        }.scope(this));

        // Add the hover style
        this.container.delegate('tr.item', 'mouseenter', function() {
            $(this).addClass("hover");
        });
        this.container.delegate('tr.item', 'mouseleave', function() {
            $(this).removeClass("hover");
        });

        // Row selection with mouse
        var mouse_last_selected = null;
        var trigger = this.trigger.scope(this);
        this.container.delegate('tr.item', 'click', function(event) {
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

        if (configuration.sortable) {
            // Add the sorting if the table is sortable
            content.find('table').tableDnD({
                dragHandle: "dragHandle",
                onDragClass: "dragging",
                onDragStart: function(table, row) {
                    // Reset hover style and mouse mouse_last_selected
                    $(row).removeClass('hover');
                    mouse_last_selected = null;
                    $(table).removeClass('static');
                },
                onDrop: function(table, row) {
                    // XXX Send new order to server
                    //$("#SMIContents_rows").setClassSequence();
                    $(table).addClass('static');
                    this.trigger('selectionchange-smilisting');
                }.scope(this)
            });
        };

        // Add default data
        this.new_lines(data);
    };

    /**
     * Trigger an event on the listing data.
     * @param event_name: name of the event to trigger
     */
    SMIListing.prototype.trigger = function (event_name) {
        var total = this.container.children('tr.item').length;
        var selected = this.container.children('tr.item.selected').length;

        this.container.trigger(event_name, {total: total, selected: selected});
    };

    /**
     * Add a list of lines later one.
     */
    SMIListing.prototype.new_lines = function(data) {
        if (this.header.is('.collapsed')) {
            this.header.one('collapsingchange-smilisting', function() {
                // On first next display, add the data.
                this.add_lines(data);
            }.scope(this));
        } else {
            this.add_lines(data);
        };
    };

    /**
     * Imediately add a list of lines to the listing.
     * @param data: list of line data
     */
    SMIListing.prototype.add_lines = function(data) {
        if (data.length) {
            // Fill in table
            $.each(data, function(i, line) {
                this.add_line(line);
            }.scope(this));
        } else {
            // Add a message no lines.
            // XXX should come from a template, i18n
            var empty_line = $('<tr class="empty"></tr>');
            var empty_cell = $('<td>There is no items here.</td>');

            empty_cell.attr('colspan', this.configuration.columns.length);
            empty_line.append(empty_cell);
            this.container.append(empty_line);
        };
        this.trigger('contentchange-smilisting');
    };

    /**
     * Add one line to the listing.
     * @param data: line data.
     */
    SMIListing.prototype.add_line = function(data) {
        // Add a data line to the table
        var line = $('<tr class="item"></tr>');

        $.each(this.configuration.columns, function(i, column) {
            var cell = $('<td></td>');

            if (!i) {
                cell.addClass('first');
            };
            if (this.configuration.sortable == column.name) {
                cell.addClass('dragHandle');
            };
            listingcolumns.render(cell, {
                data: data,
                name: column.view,
                extra: {smi: this.smi,
                        column: column}});
            line.append(cell);
        }.scope(this));
        line.attr('id', 'list' + data['id'].toString());
        line.data('smilisting', data);
        this.container.append(line);
    };

    /**
     * Return the line associated to the given id.
     * @param id: line id
     */
    SMIListing.prototype.get_line = function(id) {
        return this.container.children('#list' + id.toString());
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

            if (this.configuration.sortable == column.name) {
                cell.addClass('dragHandle');
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
        this.unselect(this.container.children('tr.item.selected'));
    };

    /**
     * Select all elements.
     */
    SMIListing.prototype.select_all = function() {
        this.container.children('tr.item').addClass('selected');
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
                            if (first_cfg.sortable == column.name) {
                                cell.addClass('dragHandle');
                            };
                            if (column.caption) {
                                cell.text(column.caption);
                            };
                            header.append(cell);
                        });

                        $.each(this.configuration.listing, function(i, configuration) {
                            var listing = new SMIListing(
                                configuration.name, this.smi, this.data[configuration.name], configuration);

                            this.listings.push(listing);
                        }.scope(this));

                        // Fix table widths
                        var listing = this.content.find('dd.publishables table');

                        listing.updateTableColumnsWidths({fixedColumns: {0:16, 1:16}});
                        this.content.find('div.header table').updateTableColumnsWidths(
                            {source: '#workspace dd.publishables table'});
                        this.content.find('dd.assets table').updateTableColumnsWidths(
                            {source: '#workspace dd.publishables table',
                             skipColumns: {1:true}});

                    },
                    cleanup: function() {
                        this.content.empty();
                        this.content.enableTextSelect();
                    }
                });

            }});
    });

})(jQuery, obviel);
