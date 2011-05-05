

(function($, obviel) {

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

    var render_header = function(configuration, $content) {
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

    $(document).bind('load-smiplugins', function(event, smi) {

        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
                for (var iface in configuration.ifaces) {
                    obviel.iface(iface, configuration.ifaces[iface]);
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
                        }
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
                            trigger('selectionchange-smilisting');
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
                            if (true) {
                            //if (objects_match([listing.data.content], configuration.sortable.available)) {
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
                    html_url: smi.options.listing.templates.content,
                    init: function() {
                        this.configuration = configuration;
                        this.$containers = $([]);
                        this.by_name = {};
                    },
                    get_line: function(id) {
                        return this.$containers.children('#list' + id.toString());
                    },
                    add_lines: function(data) {
                        for (var name in this.by_name) {
                            var lines = data[name];

                            if (lines && lines.length) {
                                this.by_name[name].trigger('addline-smilisting', {lines: lines});
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
                        $lines.filter('.inputized').each(function(i, line) {
                            var $line = $(line);
                            this.update_line($line, $line.data('smilisting'));
                        }.scope(this));
                        $lines.removeClass('selected');
                        this.trigger('selectionchange-smilisting');
                    },
                    unselect_all: function() {
                        this.unselect(this.$containers.children('tr.item.selected:visible'));
                    },
                    select_all: function() {
                        this.$containers.children('tr.item:visible').addClass('selected');
                        this.trigger('selectionchange-smilisting');
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
                        render_header(this.configuration, this.$content);

                        // Create containers
                        $.each(this.configuration.listing, function(i, configuration) {
                            var container = create_container(
                                configuration.name,
                                configuration,
                                this.data.items[configuration.name],
                                this);
                            this.$containers = this.$containers.add(container);
                            this.by_name[configuration.name] = container;
                        }.scope(this));

                        // Bind and update the listing column sizes
                        this.update_widths();
                        this.$content.bind('collapsingchange-smilisting', function() {
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
                            $reference.updateTableColumnsWidths(layout);
                            $header.updateTableColumnsWidths({}, $reference);

                            for (var i=0; i < others.length; i++) {
                                others[i].updateTableColumnsWidths(other_layouts[i], $reference);
                            };
                        };
                    },
                    cleanup: function() {
                        this.$content.empty();
                        this.$content.unbind('collapsingchange-smilisting');
                        this.$content.unbind('selectionchange-smilisting');
                    }
                });

            }});
    });

})(jQuery, obviel);
