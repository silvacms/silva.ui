

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


    // Define columns renderers
    var listingcolumns = new obviel.Registry();

    listingcolumns.register({
        name: 'action',
        jsont: '<a rel="{column.action|htmltag}" href="{data.path|htmltag}">{value}</a>',
        render: function() {
            var link = this.content.children('a');

            link.bind('click', function(event) {
                this.smi.open_screen_from_link(link);
                return false;
            }.scope(this));
        }
    });

    listingcolumns.register({
        name: 'text',
        jsont: '{value}'
    });

    listingcolumns.register({
        name: 'icon',
        html: '<ins class="icon"></ins>',
        render: function() {
            var icon = this.content.children('ins');

            if (this.value.indexOf('.') < 0) {
                icon.addClass(this.value);
            } else {
                icon.attr(
                    'style',
                    'background:url(' + this.value + ') no-repeat center center');
            };
        }
    });

    listingcolumns.register({
        name: 'workflow',
        html: '<ins class="state"></ins>',
        render: function() {
            if (this.value) {
                this.content.children('ins').addClass(this.value);
            };
        }
    });

    // For action.smilisting add a clear selection action
    obviel.view({
        iface: 'content',
        name: 'action.smilisting',
        order: 0,
        html: '<li><a class="close-selection ui-state-default" title="close selection">' +
            '<ins class="ui-icon ui-icon-closethick"></ins></a></li>',
        render: function() {
            var link = this.content.find('a');

            link.bind('click', function() {
                this.data.close();
            }.scope(this));
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

            this.content.append(item);
        }
    });

    obviel.view({
        iface: ['actionresult'],
        render: function() {
            for (var post_action in this.data.post_actions) {
                switch(post_action) {
                case 'remove':
                    this.selection.remove(this.data.post_actions.remove);
                    break;
                case 'update':
                    var need_refresh = this.selection.update(this.data.post_actions.update);
                    // The update of the data might have trigger some data changes
                    // in the selection.
                    if (need_refresh) {
                        this.content.triggerHandler(
                            'actionrefresh-smilisting', {data: this.selection});
                    };
                    break;
                case 'new_data':
                    this.content.trigger('newdata-smilisting', this.data.post_actions.new_data);
                    break;
                case 'clear_clipboard':
                    this.smi.clipboard.clear(true);
                    break;
                };
            };
            if (this.data.notifications) {
                this.smi.notifications.notifies(this.data.notifications);
            };
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
                init: function() {
                    this.collecting = false;
                },
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
                        case 'item_values':
                            var names = action.action.rest.values;
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
                                this.content.render({data: result,
                                                     extra: {selection: this.data,
                                                             smi: this.smi}});
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


    var SMIFilterSelector = function(listing) {
        this.$filter = listing.$header.find('.filter');
        this.listing = listing;

        // Nothing is filterable, don't initialize the feature.
        if (!listing.filterables) {
            this.$filter.hide();
            return;
        };

        // Hide filter if the header is hidden.
        this.listing.$header.bind('collapsingchange-smilisting', function() {
            this.$filter.fadeToggle();
        }.scope(this));
        if (this.listing.$header.is('.collapsed')) {
            this.$filter.hide();
        };

        this.$filter.bind('keyup', function(event) {
            var clear_field = false;

            if (event.keyCode == 13) {
                // Enter unfocus the field
                this.$filter.blur();
                return;
            } else if (event.keyCode == 27) {
                // Escape clear the field
                clear_field = true;
                this.$filter.blur();
            };
            setTimeout(function() {
                var value = '';

                if (clear_field) {
                    this.$filter.val('');
                } else {
                    value = this.$filter.val();
                };
                this.listing.filter_lines(new RegExp(value, 'i'));
            }.scope(this), 0);
        }.scope(this));
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
        var column_index = this.listing.configuration.column_index;

        $.each(this._raw_items, function(i, line) {
            var $line = $(line);
            var tabindex = names.length * $line.index() + 1;
            $.each(names, function(e, name) {
                var index = column_index(name);
                var data = $line.data('smilisting')[name];
                var $cell = $line.children(':eq(' + index + ')');
                var $input = $('<input type="text"/ >');
                $input.attr('tabindex', tabindex);
                tabindex += 1;
                $input.val(data);
                $cell.empty();
                $cell.append($input);
            });
            $line.addClass('inputized');
        });
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

                if (!action.prev().is('.selected')) {
                    action.remove();
                };
            });

            var last_selected = this.listing.$container.children('.selected:first');
            var selected_items = $();
            var next_item = null;

            while (last_selected.length) {
                selected_items = selected_items.add(last_selected.nextUntil(':not(.selected)').andSelf());
                last_selected = selected_items.last();
                next_item = last_selected.next();

                if (next_item.is('.hidden')) {
                    next_item = next_item.nextOne(':not(.hidden)');
                    if (next_item.is('.selected')) {
                        last_selected = next_item;
                        continue;
                    };
                };
                var visible_selected_items = selected_items.filter(':not(.hidden)');

                if (next_item.is('.actions')) {
                    // Next item is an action line.
                    var following = next_item.next();
                    if (following.is('.hidden')) {
                        following = following.nextOne(':not(.hidden)');
                    };
                    if (following.is('.selected')) {
                        // The after block is selected, remove the
                        // action line and continue.
                        next_item.remove();
                        last_selected = following;
                        continue;
                    } else if (!visible_selected_items.length) {
                        // The selection is no longer visible
                        next_item.remove();
                    } else {
                        // The selection might have got bigger from
                        // the top. Rerender actions.
                        render_actions(visible_selected_items, next_item.find('ol'));
                    };
                    next_item = following;
                } else if (visible_selected_items.length) {
                    // We have items, let's insert an action line
                    var action_line = $('<tr class="actions"><td><ol></ol></td></tr>');
                    var action_cell = action_line.children('td');
                    var actions = action_cell.children('ol');

                    action_cell.attr('colspan', this.listing.configuration.columns.length);
                    render_actions(visible_selected_items, actions);
                    actions.bind('actionrefresh-smilisting', function(event, data) {
                        // If an action is executed, rerender the action line.
                        var actions = $(this);

                        actions.empty();
                        render_actions(data.data, actions);
                    });
                    last_selected.after(action_line);
                };
                selected_items = $();
                last_selected = next_item.nextOne('.selected');
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
        this.filterables = [];
        this.sortable = configuration.sortable;
        this.smi = smi;

        $.each(configuration.columns, function(i, column) {
            if (column.filterable) {
                this.filterables.push(column.name);
            };
        }.scope(this));

        this.ui = {};
        this.ui.selector = new SMIMultiSelector(this);
        this.ui.filter = new SMIFilterSelector(this);
        this.ui.actions = new SMIActions(this);
        this.ui.counter = new SMIViewCounter(this);

        this.smi.shortcuts.create(name, $content);

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
            this.$header.bind('click', function(event) {
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
        };

        {
            // Page up / down movement
            var viewport = $content.parent();
            var size = viewport.height() / 2;

            this.smi.shortcuts.bind(name, 'pagedown', function() {
                viewport.SMISmoothScroll('slow', 'down', size);
                return false;
            });
            this.smi.shortcuts.bind(name, 'pageup', function() {
                viewport.SMISmoothScroll('slow', 'up', size);
                return false;
            });
        };

        {
            // Row selection
            var last_selected_index = null;
            var trigger = this.trigger.scope(this);
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
            this.$container.delegate('tr.item', 'mouseenter', function() {
                set_hovered_row($(this));
            });
            this.$container.delegate('tr.item', 'mouseleave', function() {
                clear_hovered_row();
            });

            // Row selection with mouse
            this.$container.delegate('tr.item', 'click', function(event) {
                var target = $(event.target);
                if (target.is('input[type="text"]')) {
                    target.focus();
                    return;
                };
                select_row($(this), event.shiftKey);
            });

            // Keyboard row manipulation
            this.smi.shortcuts.bind(name, 'space shift+space', function(event) {
                select_row(get_hovered_row(), event.shiftKey);
                return false;
            });
            this.smi.shortcuts.bind(name, 'up shift+up', function(event) {
                var row = get_hovered_row();
                var candidate = row.prev();

                while (candidate.length &&
                       (candidate.is('.hidden') || candidate.is('.actions'))) {
                    candidate = candidate.prev();
                };
                set_hovered_row(candidate);
                if (event.shiftKey) {
                    select_row(candidate);
                };
                return false;
            });
            this.smi.shortcuts.bind(name, 'down shift+down', function(event) {
                var row = get_hovered_row();
                var candidate = row.next();

                while (candidate.length &&
                       (candidate.is('.hidden') || candidate.is('.actions'))) {
                    candidate = candidate.next();
                };
                set_hovered_row(candidate);
                if (event.shiftKey) {
                    select_row(candidate);
                };
                return false;
            });
            this.smi.shortcuts.bind(name, 'esc', function() {
                this.unselect_all();
                return false;
            }.scope(this));
            this.smi.shortcuts.bind(name, 'f', function() {
                this.ui.filter.$filter.focus();
                return false;
            }.scope(this));

            if (this.configuration.sortable) {
                var table = $content.find('table');

                // Add the sorting if the table is sortable
                table.tableDnD({
                    dragHandle: "moveable",
                    onDragClass: "dragging",
                    onDragStart: function(table, row) {
                        // Reset hover style and mouse last_selected_index
                        $(row).removeClass('hover');
                        last_selected_index = null;
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
        };

        // Add default data
        this.new_lines(data, true);
    };

    // Called when the listing is cleaned
    SMIListing.prototype.cleanup = function() {
        this.smi.shortcuts.remove(this.name);
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
        var sortable = this.configuration.sortable;
        var smi = this.smi;

        $.each(this.configuration.columns, function(i, column) {
            var cell = $('<td></td>');

            if (!i) {
                cell.addClass('first');
            };
            if (sortable &&
                $.inArray(column.name, sortable.columns) >= 0) {
                cell.addClass('moveable');
            };
            listingcolumns.render(cell, {
                data: data,
                name: column.view,
                ifaces: ['object'],
                extra: {smi: smi,
                        column: column,
                        value: data[column.name]}});
            line.append(cell);
        });
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
            this.update_line(this.get_line(line['id']), line);
        }.scope(this));
    };

    /**
     * Update a line with more recent data.
     * @param line: line to update
     * @param data: data to update the line with
     */
    SMIListing.prototype.update_line = function($line, data) {
        var smi = this.smi;
        var columns = this.configuration.columns;

        $line.children().each(function(i, content) {
            var column = columns[i];

            listingcolumns.render($(content), {
                data: data,
                name: column.view,
                ifaces: ['object'],
                extra: {smi: smi,
                        column: column,
                        value: data[column.name]}});
        });
        $line.removeClass('inputized');
        $line.data('smilisting', data);
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

    SMIListing.prototype.filter_lines = function(pattern) {
        var names = this.filterables;
        var match = function(data) {
            for (var i=0; i < names.length ; i++) {
                if (data[names[i]].match(pattern))
                    return true;
            };
            return false;
        };
        this.$container.children('.item').each(function (i) {
            var $line = $(this);

            if (match($line.data('smilisting'))) {
                $line.removeClass('hidden');
            } else {
                $line.addClass('hidden');
            };
        });
        this.trigger('selectionchange-smilisting');
    };

    /**
     * Unselect the given items.
     * @param $lines: lines to unselect.
     */
    SMIListing.prototype.unselect = function($lines) {
        $lines.filter('.inputized').each(function(i, line) {
            var $line = $(line);
            this.update_line($line, $line.data('smilisting'));
        }.scope(this));
        $lines.removeClass('selected');
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
                for (var iface in configuration.ifaces) {
                    obviel.iface(iface, configuration.ifaces[iface]);
                };

                var action_url = jsontemplate.Template(smi.options.listing.action, {});
                register_action_buttons(
                    configuration.actions,
                    action_url,
                    'action.smilisting');
                register_action_buttons(
                    configuration.clipboard_actions,
                    action_url,
                    'clipboardaction.smilisting');

                $.each(configuration.listing, function(i, lst_configuration) {
                    lst_configuration.column_index = function(name) {
                        for (var i=0; i < this.columns.length; i++) {
                            if (name == this.columns[i].name)
                                return i;
                        };
                        return -1;
                    }.scope(lst_configuration);
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
