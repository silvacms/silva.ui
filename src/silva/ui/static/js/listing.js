

(function($, infrae) {

    // Define columns renderers
    var listingcolumns = infrae.views.Registry();

    listingcolumns.register({
        name: 'action',
        factory: function($content, data, column, value) {
            return {
                column: column,
                value: value,
                jsont: '<a class="open-screen" rel="{column.action|htmltag}" href="{data.path|htmltag}">{value}</a>'
            };
        }
    });

    listingcolumns.register({
        name: 'text',
        factory: function($content, data, column, value) {
            return {
                value: value,
                jsont: '{value}'
            };
        }
    });

    listingcolumns.register({
        name: 'move',
        factory: function($content, data, column, value) {
            return {
                render: function() {
                    if (value) {
                        $content.addClass('moveable');
                        $content.html('...');
                    };
                }
            };
        }
    });

    listingcolumns.register({
        name: 'goto',
        factory: function($content, data, column, value) {
            return {
                column: column,
                value: value,
                jsont: '<div class="actions"><ol><li class="last-action"><a class="ui-state-default open-screen" rel="{column.index.screen|htmltag}" href="{data.path|htmltag}"><div class="dropdown-icon"><ins class="ui-icon ui-icon-triangle-1-s" /></div><span>{column.index.caption}</span></a><div class="dropdown"><ol></ol></div></li></ol></div>',
                render: function() {
                    var $opener = $content.find('div.dropdown-icon');
                    var $dropdown = $content.find('div.dropdown');
                    var $entries = $dropdown.children('ol');

                    for (var i=0; i < column.menu.length; i++) {
                        var entry = column.menu[i];

                        if ((entry.item_implements == undefined ||
                             infrae.interfaces.isImplementedBy(entry.item_implements, data)) &&
                            (entry.item_match == undefined ||
                             infrae.utils.match(entry.item_match, [data]))){
                            $entries.append(
                                '<li><a class="ui-state-default open-screen" href="' + data.path +
                                    '" rel="' + entry.screen + '"><span>' +
                                    entry.caption + '</span></a></li>');
                        };
                    };
                    $content.addClass('hasdropdown');
                    $opener.bind('click', function(event) {
                        $dropdown.fadeToggle();
                        return false;
                    });
                    $dropdown.bind('mouseleave', function() {
                        $dropdown.fadeOut('fast');
                    });
                }
            };
        }
    });

    listingcolumns.register({
        name: 'action-icon',
        factory: function($content, data, column, value) {
            return {
                column: column,
                jsont: '<a class="open-screen" href="{data.path|htmltag}" rel="{column.action|htmltag}" title="{data.title|htmltag}"><ins class="icon"></ins></a>',
                render: function() {
                    infrae.ui.icon($content.find('ins'), value);
                }
            };
        }
    });

    listingcolumns.register({
        name: 'workflow',
        factory: function($content, data, column, value) {
            return {
                html: '<ins class="state first"></ins><ins class="state"></ins>',
                render: function() {
                    if (value) {
                        var states = $content.children('ins');
                        states.first().addClass(value[0]);
                        states.last().addClass(value[1]);
                    };
                }
            };
        }
    });

    /**
     * Render/bind top listing header.
     * @param $content: listing JQuery element.
     * @param configuration: listing configuration.
     */
    var render_listing_header = function($content, configuration) {
        var first_configuration = configuration.listing[0];
        var $table = $content.find('div.listing-header table');
        var $header = $table.find('tr');

        $table.prepend("<colgroup>" +
                       Array(first_configuration.columns.length + 1).join("<col></col>") +
                       "</colgroup>");

        $.each(first_configuration.columns, function(i, column) {
            var $cell = $('<th></th>');

            if (column.caption) {
                $cell.text(column.caption);
            };
            $header.append($cell);
        });

        infrae.ui.selection.disable($header);
    };

    /**
     * Render/bind top container header (of publishables or assets for instance).
     * @param $header: header JQuery element.
     * @param $container: container JQuery element associated to the header.
     * @param configuration: listing configuration.
     */
    var render_container_header = function($header, $container, configuration) {
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
            configuration.collapsed = !configuration.collapsed;
            toggle_marker();
            $header.toggleClass('collapsed');
            $container.toggleClass('collapsed');
            $header.trigger('collapsingchange-smilisting');
        };

        if (configuration.collapsed) {
            toggle_marker();
            $header.addClass('collapsed');
            $container.addClass('collapsed');
            $header.trigger('collapsingchange-smilisting');
        };
        $header.bind('click', function(event) {
            toggle_collapsing();
            return false;
        });
    };

    /**
     * Render/bind the user selection process.
     */
    var render_selection = function($containers, selector, shortcuts) {
        // Row selection
        var last_selected_index = null;
        var $hovered_row = null;

        var get_hovered_row = function() {
            if ($hovered_row === null) {
                $hovered_row = $containers.first().find('tr.item:first');
                $hovered_row.addClass("hover");
            };
            return $hovered_row;
        };
        var clear_hovered_row = function() {
            if ($hovered_row !== null) {
                $hovered_row.removeClass("hover");
            };
            $hovered_row = null;
        };
        var set_hovered_row = function($row) {
            if ($row.length) {
                clear_hovered_row();
                $hovered_row = $row;
                $hovered_row.addClass("hover");
            };
        };

        // Set the hover column on hovering
        $containers.delegate('tr.item', 'mouseenter', function() {set_hovered_row($(this));});
        $containers.delegate('tr.item', 'mouseleave', clear_hovered_row);
        $containers.bind('resetselection-smilisting', function() {
            clear_hovered_row();
            last_selected_index = null;
        });

        var select_row = function($row, multiple) {
            if (last_selected_index === null || !multiple) {
                last_selected_index = $row.index();
                selector($row);
            } else {
                // Multiple selection
                var current_index = $row.index();

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
                    var $lines = $row.parent().children().slice(start, end).filter('.item:visible');
                    selector($lines);
                };
                last_selected_index = current_index;
            };
        };

        // Actions with mouse, to be bound before row selection
        $containers.delegate('tr.item a.open-screen', 'click', function(event) {
            smi.open_screen_from_link($(event.target).parents('a.open-screen'));
            return false;
        });

        // Row selection with mouse
        $containers.delegate('tr.item', 'click', function(event) {
            var target = $(event.target);
            if (target.is('input[type="text"]')) {
                target.focus();
                return;
            };
            select_row($(this), event.shiftKey);
        });
        // Row selection with keyboard
        shortcuts.bind('listing', null, ['space', 'shift+space'], function(event) {
            select_row(get_hovered_row(), event.shiftKey);
            return false;
        });

        // Row movement with keyboard
        shortcuts.bind('listing', null, ['up', 'shift+up'], function(event) {
            var $row = get_hovered_row();
            var $candidate = $row.prev();

            while ($candidate.length && !$candidate.is(':visible'))
                $candidate = $candidate.prev();
            set_hovered_row($candidate);
            if (event.shiftKey)
                select_row($candidate);
            return false;
        });
        shortcuts.bind('listing', null, ['down', 'shift+down'], function(event) {
            var $row = get_hovered_row();
            var $candidate = $row.next();

            while ($candidate.length && !$candidate.is(':visible'))
                $candidate = $candidate.next();
            set_hovered_row($candidate);
            if (event.shiftKey)
                select_row($candidate);
            return false;
        });
    };

    var render_container = function(name, configuration, lines, mover) {
        var $content = $('dd.' + name);
        var $header = $('dt.' + name);
        var $table = $content.find('table');
        var $container = $table.find('tbody');

        // Collapse feature / table header.
        render_container_header($header, $content, configuration);

        var render_line = function(data) {
            // Add a data line to the table
            var $line = $('<tr class="item"></tr>');
            var line = {};

            $line.attr('id', 'list' + data['id'].toString());

            var render_cell = function(column) {
                var $cell = $('<td></td>');

                if (column.view) {
                    $cell.bind('refreshcell-smilisting', function(event, data) {
                        var $cell = $(this);
                        var value = null;

                        if (column.name) {
                            value = data[column.name];
                        };
                        listingcolumns.render($cell, {
                            data: data,
                            name: column.view,
                            ifaces: ['object'],
                            args: [column, value]});
                        event.stopPropagation();
                        event.preventDefault();
                    });
                    if (column.name) {
                        $cell.bind('inputcell-smilisting', function(event, data) {
                            var $cell = $(this);
                            var $field = $('<input type="text" />');

                            $field.val(data[column.name]);
                            $cell.empty();
                            $cell.append($field);
                            event.stopPropagation();
                            event.preventDefault();
                        });
                    };
                };
                $line.append($cell);
            };

            infrae.utils.each(configuration.columns, render_cell);

            $.extend(line, {
                update: function(data) {
                    if (data != undefined) {
                        $line.data('smilisting', data);
                    } else {
                        data = $line.data('smilisting');
                    };
                    $line.children().each(function() {
                        $(this).triggerHandler('refreshcell-smilisting', data);
                    });
                },
                input: function(names) {
                    var data = $line.data('smilisting');

                    infrae.utils.each(names, function(name) {
                        var index = configuration.column_index(name);
                        var $cell = $line.children(':eq(' + index + ')');

                        $cell.triggerHandler('inputcell-smilisting', data);
                    });
                    $line.addClass('inputized');
                },
                values: function(names) {
                    var data = $line.data('smilisting');
                    var values = {id: data['id']};

                    infrae.utils.each(names, function(name) {
                        var index = configuration.column_index(name);
                        var $cell = $line.children(':eq(' + index + ')');

                        values[name] = $cell.find('input').val();
                    });
                    return values;
                }
            });

            line.update(data);
            $line.data('smilisting-line', line);
            $container.append($line);
            return $line.get(0);
        };

        var container = {
            add: function(lines, initial) {
                if (lines.length) {
                    if (!initial) {
                        $container.children('.empty').remove();
                    };
                    // For setting column widths, set column groups.
                    $table.prepend("<colgroup>" +
                                   Array(configuration.columns.length + 1).join("<col></col>") +
                                   "</colgroup>");

                    container.add = function(lines) {
                        var new_lines = infrae.utils.map(lines, render_line);
                        $container.trigger('containerchange-smilisting');
                        return new_lines;
                    };
                    return container.add(lines);
                } else if (initial) {
                    // Add a message no lines.
                    $container.append(
                        '<tr class="empty"><td colpsan="' + configuration.columns.length + '">There is no items here.</td></tr>');
                };
                return [];
            },
            $container: $container,
            $table: $table};

        // Add default data
        container.add(lines, true);

        // Bind table sort if needed
        if (mover) {
            var row_original_index = null;

            $table.tableDnD({
                dragHandle: "moveable",
                onDragClass: "dragging",
                onAllowDrop: function(row, candidate){
                    // don't drop on the first row, it is default.
                    return $(candidate).data('smilisting').moveable != 0;
                },
                onDragStart: function(table, cell) {
                    var $table = $(table);
                    // Reset hover style and mouse last_selected_index. Save row index.
                    row_original_index = $(cell).parent('tr').index();
                    $table.trigger('resetselection-smilisting');
                    $table.removeClass('static');
                },
                onDrop: function(table, row) {
                    var $line = $(row);
                    var $table = $(table);
                    var position = $line.index();
                    var data = $line.data('smilisting');

                    if (position != row_original_index) {
                        // The row moved.
                        if (position > row_original_index)
                            row_original_index -= 1; // Fix original index in case of failure.

                        // If the first line is not moveable, reduce the index of 1.
                        if (!$table.find('tbody tr.item:first').data('smilisting').moveable) {
                            position -= 1;
                        };
                        mover([{name: 'content', value: data['id']},
                               {name: 'position', value: position}]).pipe(function (success) {
                                   if (!success) {
                                       // The moving failed. Restore the row position.
                                       $line.detach();
                                       $line.insertAfter(
                                           $table.find('tbody tr.item:eq(' + row_original_index + ')'));
                                   };
                                   $table.addClass('static');
                                   return success;
                               });
                    } else {
                        $table.addClass('static');
                    };
                }
            });
            // If content change, reinitialize the DND
            $container.bind('containerchange-smilisting', function() {
                $table.tableDnDUpdate();
            });
        };

        return container;
    };

    var get_dom_line = function(id) {
        return document.getElementById('list' + id.toString());
    };
    var get_line = function(id) {
        return $(get_dom_line(id));
    };
    var get_lines = function(ids) {
        if (ids.length) {
            var index = ids.length - 1;
            var $lines = $(get_dom_line(ids[index]));

            while(index--) {
                $lines = $lines.add(get_dom_line(ids[index]));
            };
            return $lines;
        };
        return $([]);
    };


    var new_transaction = function() {
        var finalizer = [];

        return {
            require: function(callback) {
                if ($.inArray(callback, finalizer) < 0) {
                    finalizer.push(callback);
                };
            },
            commit: function() {
                setTimeout(function () {
                    while (finalizer.length) {
                        finalizer.pop()();
                    };
                }, 0);
            }
        };
    };


    $(document).bind('load-smilisting', function(event, data) {
        var smi = data.smi;
        var configuration = data.configuration;
        var action_url_template = new jsontemplate.Template(smi.options.listing.action, {});

        infrae.views.view({
            iface: 'listing',
            name: 'content',
            factory: function($content, data, smi) {
                var listing = {};
                var selection = $content.SMISelection();
                var $containers = $([]);
                var by_name = {};
                var events = {
                    status: infrae.deferred.Callbacks(),
                    content: infrae.deferred.Callbacks()
                };

                // Then a content event is trigger, the context is the following object.
                events.content.context(function() {
                    var info = {};

                    for (var name in by_name) {
                        info[name] = by_name[name].$container.children('tr.item').length;
                    };
                    return info;
                });
                // Then a content event is trigger, the context is the following object.
                events.status.context(function() {
                    var status = selection.status();

                    $.extend(status, {
                        content: data.content,
                        clipboard: {
                            length: smi.clipboard.length(),
                            cutted: smi.clipboard.cutted,
                            copied: smi.clipboard.copied
                        },
                        // Those are actions not data
                        get_transaction: function() {
                            var transaction = new_transaction();

                            $.extend(transaction, {
                                input: {
                                    input: function(deferred) {
                                        if (selection.input(deferred))
                                            transaction.require(events.status.invoke);
                                    },
                                    collect: function(success) {
                                        selection.collect(success);
                                        transaction.require(events.status.invoke);
                                    }
                                },
                                listing: {
                                    add: function(data, select) {
                                        var added = [];

                                        for (var name in by_name) {
                                            var lines = data[name];

                                            if (lines && lines.length) {
                                                $.merge(added, by_name[name].add(lines));
                                            };
                                        };
                                        if (added.length) {
                                            selection.select($(added));
                                            transaction.require(events.content.invoke);
                                            transaction.require(events.status.invoke);
                                        };
                                    },
                                    update: function(lines) {
                                        if (lines.length) {
                                            infrae.utils.each(lines, function(line) {
                                                get_line(line['id']).data('smilisting-line').update(line);
                                            });
                                            transaction.require(events.status.invoke);
                                        };
                                    },
                                    remove: function(ids) {
                                        var $lines = get_lines(ids);

                                        if ($lines.length) {
                                            selection.remove($lines);
                                            transaction.require(events.content.invoke);
                                            transaction.require(events.status.invoke);
                                        };
                                    }
                                },
                                clipboard: {
                                    cut: function(data) {
                                        smi.clipboard.cut(data);
                                        transaction.require(events.status.invoke);
                                    },
                                    copy: function(data) {
                                        smi.clipboard.copy(data);
                                        transaction.require(events.status.invoke);
                                    },
                                    clear: function() {
                                        smi.clipboard.clear();
                                    }
                                }
                            });
                            return transaction;
                        },
                        query_server: function(action, data) {
                            return smi.ajax.query(
                                action_url_template.expand({path: smi.opened.path, action: action}),
                                data);
                        }
                    });
                    return status;
                });

                var update_container_sizes = function() {
                    var $header = $content.find('div.listing-header table');
                    var $reference = null;
                    var layout = null;
                    var others = [];
                    var other_layouts = [];

                    $.each(configuration.listing, function(i, configuration) {
                        var $table = by_name[configuration.name].$table;

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
                        var update = infrae.ui.updateTableColumnsWidths;
                        update($reference, layout);
                        update($header, {}, $reference);

                        for (var i=0; i < others.length; i++) {
                            update(others[i], other_layouts[i], $reference);
                        };
                    };
                };
                events.content.add(update_container_sizes);

                $.extend(listing, {
                    html_url: smi.options.listing.templates.content,
                    events: {
                        content: function(callback) {
                            events.content.add(callback, true);
                        },
                        status: function(callback) {
                            events.status.add(callback, true);
                        }
                    },
                    filter_lines: function(value) {
                        var pattern = new RegExp(value, 'i');

                        $.each(configuration.listing, function(i, configuration) {
                            var $container = by_name[configuration.name].$container;

                            $container.children('.item').each(function (i) {
                                var $line = $(this);

                                if (configuration.filter_entry(pattern, $line.data('smilisting'))) {
                                    $line.show();
                                } else {
                                    $line.hide();
                                };
                            });
                        });
                        events.status.invoke();
                    },
                    unselect_all: function() {
                        if (selection.unselect($containers.children('tr.item.selected:visible'))) {
                            events.status.invoke();
                        }
                    },
                    select_all: function() {
                        if (selection.select($containers.children('tr.item:visible'))) {
                            events.status.invoke();
                        };
                    },
                    render: function() {
                        // Shortcuts
                        smi.shortcuts.create('listing', $content, true);

                        // Render header
                        render_listing_header($content, configuration);

                        // Create containers
                        $.each(configuration.listing, function(i, configuration) {
                            var mover = null;

                            if (configuration.sortable &&
                                infrae.utils.match(configuration.sortable.content_match, [data.content])) {
                                mover = function (data) {
                                    return smi.ajax.query(
                                        action_url_template.expand(
                                            {path: smi.opened.path,
                                             action: configuration.sortable.action}),
                                        data);
                                };
                            };

                            var container = render_container(
                                configuration.name,
                                configuration,
                                data.items[configuration.name],
                                mover);
                            $containers = $containers.add(container.$container);
                            by_name[configuration.name] = container;
                        });

                        // Selection
                        render_selection(
                            $containers,
                            function ($items) {
                                if (selection.toggle($items)) {
                                    events.status.invoke();
                                };
                            },
                            smi.shortcuts);

                        // Bind and update the listing column sizes
                        update_container_sizes();
                        // Then collpasing change, update column sizes, and trigger a new status.
                        $content.bind('collapsingchange-smilisting', function() {
                            update_container_sizes();
                            events.status.invoke();
                        });

                        // Render footer
                        $content.find('.listing-footer').render({data: data, name: 'footer', args: [smi, this]});
                    },
                    cleanup: function() {
                        smi.shortcuts.remove('listing');
                        $content.unbind('collapsingchange-smilisting');
                        $content.empty();
                    }
                });
                return listing;
            }
        });

    });

    $(document).bind('load-smiplugins', function(event, smi) {
        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
                // Register content interfaces.
                for (var iface in configuration.ifaces) {
                    infrae.interfaces.register(iface, configuration.ifaces[iface]);
                };

                // Add some usefull methods to the configuration object.
                $.each(configuration.listing, function(i, configuration) {
                    // Add column_index function
                    configuration.column_index = function(name) {
                        for (var i=0; i < configuration.columns.length; i++) {
                            if (name == configuration.columns[i].name)
                                return i;
                        };
                        return -1;
                    };

                    // Add filter_entry function
                    var names = [];

                    $.each(configuration.columns, function(e, column) {
                        if (column.filterable) {
                            names.push(column.name);
                        };
                    });
                    configuration.filter_entry = function(pattern, data) {
                        for (var i=0; i < names.length ; i++) {
                            if (data[names[i]].match(pattern))
                                return true;
                        };
                        return false;
                    };
                });

                // Load smilisting.
                $(document).trigger('load-smilisting', {smi: smi, configuration: configuration});
            }
        });
    });

})(jQuery, infrae);
