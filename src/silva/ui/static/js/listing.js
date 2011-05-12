

(function($, infrae) {

    // Define columns renderers
    var listingcolumns = infrae.views.Registry();

    listingcolumns.register({
        name: 'action',
        factory: function($content, data, smi, column, value) {
            return {
                column: column,
                value: value,
                jsont: '<a rel="{column.action|htmltag}" href="{data.path|htmltag}">{value}</a>',
                render: function() {
                    var $link = $content.children('a');

                    $link.bind('click', function(event) {
                        smi.open_screen_from_link($link);
                        return false;
                    });
                }
            };
        }
    });

    listingcolumns.register({
        name: 'text',
        factory: function($content, data, smi, column, value) {
            return {
                value: value,
                jsont: '{value}'
            };
        }
    });

    listingcolumns.register({
        name: 'move',
        factory: function($content, data, smi, column, value) {
            return {
                html: '...',
                render: function() {
                    $content.addClass('moveable');
                }
            };
        }
    });

    listingcolumns.register({
        name: 'goto',
        factory: function($content, data, smi, column, value) {
            return {
                column: column,
                value: value,
                jsont: '<div class="actions"><ol><li><a class="ui-state-default" rel="{column.index.screen|htmltag}" href="{data.path|htmltag}"><div class="dropdown-icon"><ins class="ui-icon ui-icon-triangle-1-s" /></div><span>{column.index.caption}</span></a><div class="dropdown"><ol></ol></div></li></ol></div>',
                render: function() {
                    var $opener = $content.find('div.dropdown-icon');
                    var $dropdown = $content.find('div.dropdown');
                    var $entries = $dropdown.children('ol');

                    for (var i=0; i < column.menu.length; i++) {
                        var entry = column.menu[i];

                        if (entry.require_iface == undefined ||
                            infrae.interfaces.isProvidedBy(entry.required_iface, data)){
                            $entries.append(
                                '<li><a class="ui-state-default" href="' + data.path +
                                    '" rel="' + entry.screen + '"><span>' +
                                    entry.caption + '</span></a></li>');
                        };
                    };

                    $content.delegate('a', 'click', function(event) {
                        smi.open_screen_from_link($(event.target).parent('a'));
                        return false;
                    });
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
        factory: function($content, data, smi, column, value) {
            return {
                column: column,
                jsont: '<a href="{data.path|htmltag}" rel="{column.action|htmltag}" title="{data.title|htmltag}"><ins class="icon"></ins></a>',
                render: function() {
                    infrae.ui.icon($content.find('ins'), value);

                    $content.delegate('a', 'click', function(event) {
                        smi.open_screen_from_link($(event.target).parent('a'));
                        return false;
                    });
                }
            };
        }
    });

    listingcolumns.register({
        name: 'workflow',
        factory: function($content, data, smi, column, value) {
            return {
                html: '<ins class="state"></ins>',
                render: function() {
                    if (value) {
                        $content.children('ins').addClass(value);
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
        var $header = $content.find('div.listing-header tr');

        $header.disableTextSelect();
        $.each(first_configuration.columns, function(i, column) {
            var $cell = $('<th></th>');

            if (column.caption) {
                $cell.text(column.caption);
            };
            $header.append($cell);
        });
    };

    /**
     * Render bind top container header (of publishables or assets for instance).
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
            var $target = $(event.target);
            if ($target.is('input')) {
                $target.focus();
            } else {
                toggle_collapsing();
            }
            event.preventDefault();
            event.stopPropagation();
        });
        $container.bind('focus-smi', function(event) {
            if ($header.hasClass('collapsed')) {
                toggle_collapsing();
            };
            $container.parent().SMISmoothScroll(
                'slow', 'absolute',
                $container.position().top - $header.outerHeight());
        });
    };

    $(document).bind('load-smiplugins', function(event, smi) {

        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
                for (var iface in configuration.ifaces) {
                    infrae.interfaces.register(iface, configuration.ifaces[iface]);
                };

                $.each(configuration.listing, function(i, configuration) {
                    // Add column_index function
                    configuration.column_index = function(name) {
                        for (var i=0; i < this.columns.length; i++) {
                            if (name == this.columns[i].name)
                                return i;
                        };
                        return -1;
                    }.scope(configuration);

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

                $(document).trigger('load-smilisting', {smi: smi, configuration: configuration});

                var action_url_template = jsontemplate.Template(smi.options.listing.action, {});

                var create_container = function(name, configuration, data, listing) {
                    var $content = $('dd.' + name);
                    var $header = $('dt.' + name);
                    var $container = $content.find('tbody');

                    // Collapse feature / table header.
                    render_container_header($header, $content, configuration);

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
                        var select_row = function($row, multiple) {
                            if (last_selected_index === null || !multiple) {
                                last_selected_index = $row.index();
                                listing.selection.toggle($row);
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
                                    listing.selection.toggle($lines);
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
                            if (true) {
                                //if (objects_match([listing.data.content], configuration.sortable.available)) {
                                var $table = $content.find('table');

                                // Add the sorting if the table is sortable
                                $table.tableDnD({
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
                                    $table.tableDnDUpdate();
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
                                var input_line = null;
                                var input_data = {};

                                $line.attr('id', 'list' + data['id'].toString());
                                if (!initial) {
                                    $line.addClass('selected');
                                };

                                $.each(configuration.columns, function(e, column) {
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
                                                extra: {smi: listing.smi,
                                                        column: column,
                                                        value: value}});
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
                                });

                                $line.bind('refreshline-smilisting', function(event, data) {
                                    if (data != undefined) {
                                        $line.data('smilisting', data);
                                    } else {
                                        data = $line.data('smilisting');
                                    };
                                    $line.children().trigger('refreshcell-smilisting', data);
                                    event.stopPropagation();
                                    event.preventDefault();
                                });
                                $line.bind('inputline-smilisting', function(event, info) {
                                    var data = $line.data('smilisting');

                                    $.each(info.names, function(e, name) {
                                        var index = configuration.column_index(name);
                                        var $cell = $line.children(':eq(' + index + ')');

                                        $cell.trigger('inputcell-smilisting', data);
                                    });
                                    $line.addClass('inputized');
                                    event.stopPropagation();
                                    event.preventDefault();
                                });
                                $container.append($line);
                                $line.trigger('refreshline-smilisting', data);
                            });
                            // Send events
                            listing.trigger('contentchange-smilisting', $container);
                            if (!initial) {
                                listing.trigger('selectionchange-smilisting', $container);
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

                infrae.views.view({
                    iface: 'listing',
                    name: 'content',
                    factory: function($content, data, smi) {
                        var $containers = $([]);
                        var selection = $content.SMISelection();
                        var by_name = {};

                        var get_dom_line = function(id) {
                            return document.getElementById('list' + id.toString());
                        };

                        return {
                            html_url: smi.options.listing.templates.content,
                            get_line: function(id) {
                                return $(get_dom_line(id));
                            },
                            get_lines: function(ids) {
                                if (ids.length) {
                                    var index = ids.length - 1;
                                    var $lines = $(get_dom_line(ids[index]));

                                    while(index--) {
                                        $lines.add(get_dom_line(ids[index]));
                                    };
                                    return $lines;
                                };
                                return $([]);
                            },
                            add_lines: function(data) {
                                for (var name in by_name) {
                                    var lines = data[name];

                                    if (lines && lines.length) {
                                        by_name[name].trigger('addline-smilisting', {lines: lines});
                                    };
                                };
                            },
                            update_lines: function(datas) {
                                var get_line = this.get_line.scope(this);

                                $.each(datas, function(i, data) {
                                    get_line(data['id']).trigger('updateline-smilisting', data);
                                });
                            },
                            remove_lines: function(ids) {
                                var $lines = this.get_lines(ids);

                                if ($lines.length) {
                                    this.selection.remove($lines);
                                    $lines.remove();
                                    this.trigger('contentchange-smilisting');
                                };
                            },
                            filter_lines: function(value) {
                                var pattern = new RegExp(value, 'i');

                                $.each(configuration.listing, function(i, configuration) {
                                    var $container = this.by_name[configuration.name];

                                    $container.children('.item').each(function (i) {
                                        var $line = $(this);

                                        if (configuration.filter_entry(pattern, $line.data('smilisting'))) {
                                            $line.show();
                                        } else {
                                            $line.hide();
                                        };
                                    });
                                }.scope(this));
                                this.trigger('selectionchange-smilisting');
                            },
                            unselect: function($lines) {
                                this.selection.unselect($lines);
                            },
                            unselect_all: function() {
                                this.selection.unselect(this.$containers.children('tr.item.selected:visible'));
                            },
                            select_all: function() {
                                this.selection.select(this.$containers.children('tr.item:visible'));
                            },
                            trigger: function(event_name, $content) {
                                var $items = this.$containers.children('tr.item');
                                var $visible = $items.filter(':visible');
                                var $selected = $visible.filter('.selected');

                                if ($content === undefined) {
                                    $content = this.$content;
                                }
                                $content.trigger(event_name, {
                                    total: $items.length,
                                    visible: $visible.length,
                                    selected: $selected.length,
                                    items: $selected
                                });
                            },
                            render: function() {
                                // Render header
                                render_listing_header($content, configuration);

                                // Configure selection
                                selection.events.always(function() {
                                    this.trigger('selectionchange-smilisting');
                                }.scope(this));

                                // Create containers
                                $.each(configuration.listing, function(i, configuration) {
                                    var container = create_container(
                                        configuration.name,
                                        configuration,
                                        data.items[configuration.name],
                                        this);
                                    $containers = $containers.add(container);
                                    by_name[configuration.name] = container;
                                }.scope(this));

                                // Bind and update the listing column sizes
                                this.update_widths();
                                $content.bind('collapsingchange-smilisting', function() {
                                    this.update_widths();
                                }.scope(this));

                                // Render footer
                                this.$content.find('.listing-footer').render(
                                    {data: this.data, name: 'footer', extra: {smi: this.smi, view: this}});
                            },
                            update_widths: function() {
                                var $containers = this.by_name;
                                var $header = this.$content.find('div.listing-header table');
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
                                    $reference.SMIUpdateTableColumnsWidths(layout);
                                    $header.SMIUpdateTableColumnsWidths({}, $reference);

                                    for (var i=0; i < others.length; i++) {
                                        others[i].SMIUpdateTableColumnsWidths(other_layouts[i], $reference);
                                    };
                                };
                            },
                            cleanup: function() {
                                $content.unbind('collapsingchange-smilisting');
                                $content.unbind('selectionchange-smilisting');
                                $content.empty();
                            }
                        };
                    }
                });

            }});
    });

})(jQuery, infrae);
