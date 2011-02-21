

(function($) {

    obviel.iface('action');
    obviel.view({
        iface: 'action',
        name: 'column.smilisting',
        render: function(content, data) {
            var link = $('<a class="screen"></a>');

            link.text(data.value);
            link.attr('rel', data.action);
            link.attr('href', data.path);
            content.append(link);
        }
    });

    obviel.iface('text');
    obviel.view({
        iface: 'text',
        name: 'column.smilisting',
        render: function(content, data) {
            content.text(data.value);
        }
    });

    obviel.iface('icon');
    obviel.view({
        iface: 'icon',
        name: 'column.smilisting',
        render: function(content, data) {
            var icon = $('<ins class="icon"></ins>');

            if (data.value.indexOf('.') == -1) {
                icon.addClass(data.value);
            } else {
                icon.attr(
                    'style',
                    'background:url(' + data.value + ') no-repeat center center;');
            }
            content.append(icon);
        }
    });

    obviel.iface('workflow');
    obviel.view({
        iface: 'workflow',
        name: 'column.smilisting',
        render: function(content, data) {
            var icon = $('<ins class="state"></ins>');

            if (data.value) {
                icon.addClass(data.value);
            }
            content.append(icon);
        }
    });

    obviel.iface('listing');

    var SMIMultiSelector = function(listing) {
        this.selector = listing.header.find('.selector');
        this.status = 'none';
        this.listing = listing;

        // Hide selector if the header is hidden.
        this.listing.header.bind('collapsingchange.smilisting', function() {
            this.selector.fadeToggle();
        }.scope(this));
        if (this.listing.header.is('.collapsed')) {
            this.selector.hide();
        };

        // Update selector on selection change
        this.listing.container.bind('selectionchange.smilisting', function(event, changes) {
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
     * Manage element (and selected element) counter.
     */
    var SMICounter = function(listing, name) {
        this.listing = listing;
        this.counter = $('p.' + this.listing.name);
        this.total = this.counter.find('span.total');
        this.selected = this.counter.find('span.selected');
        this.selected.hide();

        // Hide counter on header collapse
        this.listing.header.bind('collapsingchange.smilisting', function() {
            this.counter.toggle();
        }.scope(this));

        // Bind selection change event
        this.listing.container.bind('selectionchange.smilisting', function(event, changes) {
            if (changes.selected) {
                this.selected.find('.count').text(changes.selected.toString());
                this.selected.show();
            } else {
                this.selected.hide();
            };
        }.scope(this));

        // Bind content change event
        this.listing.container.bind('contentchange.smilisting', function(event, changes) {
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
    var SMISelection = function(items) {
        this.items = items;

        this.length = items.length;
        this.ifaces = [];
        this.data = [];

        $.each(this.items, function (i, item) {
            var local_data = $(item).data('smilisting');

            for (var e=0; e < local_data.ifaces.length; e++) {
                if (this.ifaces.indexOf(local_data.ifaces[e])) {
                    this.ifaces.push(local_data.ifaces[e]);
                };
            };
            this.data.push(local_data);
        }.scope(this));
    };

    /**
     * Manage action buttons.
     */
    var SMIActions = function(listing) {
        this.listing = listing;

        var render_actions = function(items, cell) {
            var selection = new SMISelection(items);

            cell.render({
                every: selection,
                name: 'action.smilisting',
                extra: {listing: listing}});
        };

        this.listing.container.bind('selectionchange.smilisting', function(event, changes) {
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

        this.selector = new SMIMultiSelector(this);
        this.actions = new SMIActions(this);
        this.counter = new SMICounter(this);

        // Collapse feature
        if (configuration.collapsed) {
            this.header.addClass('collapsed');
            content.addClass('collapsed');
            this.header.trigger('collapsingchange.smilisting');
            this.header.one('collapsingchange.smilisting', function() {
                // On the first display, add the data.
                this.add_lines(data);
            }.scope(this));
        } else {
            // We are not collapsed, add data now.
            this.add_lines(data);
        };
        this.header.bind('click', function() {
            this.header.toggleClass('collapsed');
            content.toggleClass('collapsed');
            configuration.collapsed = !configuration.collapsed;
            this.header.trigger('collapsingchange.smilisting');
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
                trigger('selectionchange.smilisting');
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
                    trigger('selectionchange.smilisting');
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
                    // If you drag a selected row, trigger selection change
                    if ($(row).is('.selected')) {
                        this.trigger('selectionchange.smilisting');
                    };
                }.scope(this)
            });
        };

    };

    /**
     * Trigger an event on the listing data.
     */
    SMIListing.prototype.trigger = function (event_name) {
        var total = this.container.children('tr.item').length;
        var selected = this.container.children('tr.item.selected').length;

        this.container.trigger(event_name, {total: total, selected: selected});
    };

    /**
     * Add a list of lines to the listing.
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
        this.trigger('contentchange.smilisting');
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
            cell.render({data: data.columns[column.name], name: 'column.smilisting'});
            line.append(cell);
        }.scope(this));
        line.attr('id', 'list' + data.data['id'].toString());
        line.data('smilisting', data.data);
        this.container.append(line);
    };

    /**
     * Return the line associated to the given id.
     * @param id: Line id
     */
    SMIListing.prototype.get_line = function(id) {
        return this.container.children('#list' + id.toString());
    };

    /**
     * Remove a list of lines.
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
            this.trigger('contentchange.smilisting');
        };
        if (is_selection_changed) {
            this.trigger('selectionchange.smilisting');
        };
    };

    /**
     * Unselect all elements.
     */
    SMIListing.prototype.unselect_all = function() {
        this.container.children('tr.item.selected').removeClass('selected');
        this.trigger('selectionchange.smilisting');
    };

    /**
     * Select all elements.
     */
    SMIListing.prototype.select_all = function() {
        this.container.children('tr.item').addClass('selected');
        this.trigger('selectionchange.smilisting');
    };

    $(document).bind('load.smiplugins', function(event, smi) {
        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
                var action_url = jsontemplate.Template(smi.options.listing.action, {});
                $.each(configuration.actions, function(i, action) {
                    // Each action gets changes and listing as extra
                    $.each(action.ifaces, function (e, iface) {
                        var definition = {
                            iface: iface,
                            name: 'action.smilisting',
                            order: action.order,
                            render: function() {
                                var link = $('<a class="action"></a>');

                                link.text(action.title);
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
                            case 'max_selected':
                                definition['available'] = function() {
                                    return this.data.length <= action.available.max_selected;
                                };
                            };
                        };
                        for (var action_type in action.action) {
                            switch(action_type) {
                            case 'rest':
                                definition['action'] = function() {
                                    var url = action_url.expand({
                                            path: smi.opened.path,
                                            action: action.name});
                                    var ids = [];
                                    $.each(this.data.data, function(i, item) {
                                        ids.push({name: 'content', value:item.id});
                                    });
                                    $.ajax({
                                        url: url,
                                        type: 'POST',
                                        dataType: 'json',
                                        data: ids,
                                        success: function(result) {
                                            for (var post_action in result.post_actions) {
                                                switch(post_action) {
                                                case 'remove':
                                                    this.listing.remove_lines(result.post_actions.remove);
                                                    break;
                                                };
                                            };
                                            if (result.notifications) {
                                                smi.notifications.notifies(result.notifications);
                                            };
                                        }.scope(this)
                                    });
                                };
                            };
                        };
                        obviel.view(definition);
                    });
                });

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

                        // Fill in header
                        var first_cfg = configuration.listing[0];
                        var header = this.content.find('div.header tr');
                        $.each(first_cfg.columns, function(i, column) {
                            var cell = $('<th></th>');

                            if (!i) {
                                cell.addClass('first');
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
