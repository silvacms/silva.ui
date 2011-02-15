

(function($) {

    obviel.iface('action');
    obviel.view(
        new obviel.View({
            iface: 'action',
            name: 'listing',
            render: function(element, data) {
                var link = $('<a class="screen"></a>');

                link.text(data.value);
                link.attr('rel', data.action);
                link.attr('href', data.path);
                $(element).append(link);
            }
        })
    );

    obviel.iface('text');
    obviel.view(
        new obviel.View({
            iface: 'text',
            name: 'listing',
            render: function(element, data) {
                $(element).text(data.value);
            }
        })
    );

    obviel.iface('icon');
    obviel.view(
        new obviel.View({
            iface: 'icon',
            name: 'listing',
            render: function(element, data) {
                var icon = $('<ins class="icon"></ins>');

                if (data.value.indexOf('.') == -1) {
                    icon.addClass(data.value);
                } else {
                    icon.attr(
                        'style',
                        'background:url(' + data.value + ') no-repeat center center;');
                }
                $(element).append(icon);
            }
        })
    );

    obviel.iface('workflow');
    obviel.view(
        new obviel.View({
            iface: 'workflow',
            name: 'listing',
            render: function(element, data) {
                var icon = $('<ins class="state"></ins>');

                icon.addClass(data.value);
                $(element).append(icon);
            }
        })
    );

    obviel.iface('listing');
    obviel.view(
        new obviel.View({
            iface: 'listing',
            render: function(element, data) {
                $(element).SMIContentListing(data);
            }
        })
    );

    var SMIListing = function(content, data, cfg, template) {
        this.content = content;
        this.cfg = cfg;
        this.template = template;
        this.data = data;

        // Empty space on unload
        content.one('unload.smicontent', function(event) {
            content.empty();
        });

        // Set base template
        this.content.html(this.template);

        // Fill in header
        var header = this.content.find('div.header tr');
        $.each(this.cfg, function(i, column) {
            var cell = $('<th></th>');

            if (!i) {
                cell.addClass('dragHandle');
            };
            if (column.caption) {
                cell.text(column.caption);
            }
            header.append(cell);
        });

        // Fill in table
        var self = this;
        $.each(this.data.entries, function(i, line) {
            self.add(line);
        });

        var listing = this.content.find('div.listing table');

        // Initialize Drag and Drop
        listing.tableDnD({
            dragHandle: "dragHandle",
            onDragClass: "dragging",
            onDragStart: function(element) {
                var table = $(element);
                table.removeClass('static');
            },
            onDrop: function(element) {
                var table = $(element);
                // XXX Send new order to server
                //$("#SMIContents_rows").setClassSequence();
                element.addClass('static');
            }
        });

        // Fix table widths
        listing.updateTableColumnsWidths({fixedColumns: {0:32, 1:16}});
        this.content.find('div.header table').updateTableColumnsWidths(
            {source: '#workspace div.listing table'});


    };

    SMIListing.prototype.add = function(data) {
        // Add a data line to the table
        var container = this.content.find('div.listing tbody');
        var line = $('<tr></tr>');

        $.each(this.cfg, function(i, column) {
            var cell = $('<td></td>');

            if (!i) {
                cell.addClass('dragHandle');
            };
            cell.render(data[column.name], 'listing');
            line.append(cell);
        });
        container.append(line);
    };

    $(document).bind('load.smiplugins', function(event, smi) {
        $.ajax({
            url: smi.options.listing.columns,
            async: false,
            dataType: 'json',
            success:function(cfg) {
                $.ajax({
                    url: smi.options.listing.template,
                    async: false,
                    dataType: 'html',
                    success: function(template) {
                        $.fn.SMIContentListing = function(data) {
                            return new SMIListing($(this), data, cfg, template);
                        };
                    }});
            }});
    });

})(jQuery, obviel);
