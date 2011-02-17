

(function($) {

    obviel.iface('action');
    obviel.view({
        iface: 'action',
        name: 'listing',
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
        name: 'listing',
        render: function(content, data) {
            content.text(data.value);
        }
    });

    obviel.iface('icon');
    obviel.view({
        iface: 'icon',
        name: 'listing',
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
        name: 'listing',
        render: function(content, data) {
            var icon = $('<ins class="state"></ins>');

            if (data.value) {
                icon.addClass(data.value);
            }
            content.append(icon);
        }
    });

    obviel.iface('listing');

    var SMIListing = function(header, content, smi, data, configuration) {
        this.header = header;
        this.content = content;
        this.configuration = configuration;

        // Collapse feature
        if (configuration.collapsed) {
            header.addClass('collapsed');
            content.addClass('collapsed');
            header.one('uncollapse.smilisting', function() {
                // On the first display, add the data.
                this.add_lines(data);
            }.scope(this));
        } else {
            // We are not collapsed, add data now.
            this.add_lines(data);
        };
        header.bind('click', function() {
            header.toggleClass('collapsed');
            content.toggleClass('collapsed');
            configuration.collapsed = !configuration.collapsed;
            header.trigger('uncollapse.smilisting');
        });

        // Add the hover style
        content.delegate('tbody tr', 'mouseenter', function() {
            $(this).addClass("hover");
        });
        content.delegate('tbody tr', 'mouseleave', function() {
            $(this).removeClass("hover");
        });

        // Row selection with mouse
        var mouse_last_selected = null;
        content.delegate('tbody tr', 'click', function(event) {
            var row = $(this);

            if (mouse_last_selected === null || !event.shiftKey) {
                mouse_last_selected = row.index();
                row.toggleClass('selected');
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
                };
                mouse_last_selected = null;
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
                }
            });
        };

    };

    /**
     * Add a list of lines to the listing.
     * @param data: list of line data
     */
    SMIListing.prototype.add_lines = function(data) {
        // Fill in table
        $.each(data, function(i, line) {
            this.add_line(line);
        }.scope(this));
    };

    /**
     * Add one line to the listing.
     * @param data: line data.
     */
    SMIListing.prototype.add_line = function(data) {
        // Add a data line to the table
        var container = this.content.find('tbody');
        var line = $('<tr></tr>');

        $.each(this.configuration.columns, function(i, column) {
            var cell = $('<td></td>');

            if (!i) {
                cell.addClass('first');
            };
            if (this.configuration.sortable == column.name) {
                cell.addClass('dragHandle');
            };
            cell.render({data: data[column.name], name: 'listing'});
            line.append(cell);
        }.scope(this));
        container.append(line);
    };

    $(document).bind('load.smiplugins', function(event, smi) {
        $.ajax({
            url: smi.options.listing.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {
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
                        var first_cfg = configuration[0];
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

                        $.each(this.configuration, function(i, configuration) {
                            var content = $('dd.' + configuration.name);
                            var header = $('dt.' + configuration.name);
                            var listing = new SMIListing(
                                header, content, smi, this.data[configuration.name], configuration);

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
                    }
                });

            }});
    });

})(jQuery, obviel);
