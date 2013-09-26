

(function($, infrae, jsontemplate) {

    /**
     * Render/bind top container header (of publishables or assets for instance).
     * @param $header: header JQuery element.
     * @param $container: container JQuery element associated to the header.
     * @param configuration: listing configuration.
     */
    var toggle_header = function($header, $container, configuration) {
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

    var sort_items = function($container, $table, callback) {
        var original = null;

        $container.tableDnD({
            dragHandle: "moveable",
            onDragClass: "moving",
            onAllowDrop: function(row, candidate){
                // don't drop on the first row, it is default.
                return $(candidate).data('smilisting').moveable != 0;
            },
            onDragStart: function(row) {
                if ($table.hasClass('filtering')) {
                    return false;
                };
                // Reset hover style and mouse last_selected_index. Save row index.
                original = $(row).parent('tr').index();
                $table.trigger('resetselection-smilisting');
                $table.removeClass('static');
            },
            onDrop: function(row) {
                var $line = $(row);
                var position = $line.index();
                var data = $line.data('smilisting');

                if (position != original) {
                    // The row moved.
                    if (position > original)
                        original -= 1; // Fix original index in case of failure.

                    // If the first line is not moveable, reduce the index of 1.
                    if (!$container.children('tr.item:first').data('smilisting').moveable) {
                        position -= 1;
                    };
                    callback([{name: 'content', value: data['id']},
                              {name: 'position', value: position}]).then(function (success) {
                                  if (!success) {
                                      // The moving failed. Restore the row position.
                                      if (position < original) {
                                          original -= 1;
                                      };
                                      $line.detach();
                                      $line.insertAfter(
                                          $container.children('tr.item:eq(' + original + ')'));
                                  };
                                  $table.addClass('static');
                                  return success;
                              });
                } else {
                    $table.addClass('static');
                };
            }
        });
    };

    infrae.views.view({
        iface: 'listing-items',
        name: 'listing-container',
        factory: function($listing, data, configuration, api) {

            // Insert a line at the correct position.
            var insert_line = function($line, data, position) {
                if (position > -1) {
                    var $after = api.$container.children().eq(position);
                    if ($after.length) {
                        $after.before($line);
                    } else {
                        api.$container.append($line);
                    };
                } else {
                    api.$container.append($line);
                };
            };

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
                            infrae.smi.listing.columns.render($cell, {
                                data: data,
                                name: column.view,
                                ifaces: ['object'],
                                args: [column, value]});
                            event.stopPropagation();
                            event.preventDefault();
                        });
                        if (column.name !== undefined && column.renameable !== undefined) {
                            $cell.addClass('renameable');
                            $cell.bind('renamecell-smilisting', function(event, data) {
                                event.stopPropagation();
                                event.preventDefault();

                                if (column.renameable.item_match !== undefined &&
                                    !infrae.utils.test(data, column.renameable.item_match)) {
                                    return;
                                };
                                var $cell = $(this);
                                var $field = $('<input class="renaming" type="text" />');

                                $field.attr('name', column.name);
                                $field.val(data[column.name]);
                                $cell.empty();
                                $cell.append($field);
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
                            if (data.position > -1) {
                                // Position might have changed.
                                var new_position = data.position;
                                var $first = api.$container.children('tr.item:first');

                                if ($first.length && $first.data('smilisting').moveable) {
                                    new_position -= 1;
                                };
                                if (new_position > 0 && api.$container.children().index($line) != new_position) {
                                    $line.detach();
                                    insert_line($line, data, new_position);
                                };
                            };
                        } else {
                            data = $line.data('smilisting');
                        };
                        $line.children().each(function() {
                            $(this).triggerHandler('refreshcell-smilisting', data);
                        });
                    },
                    rename: function() {
                        var data = $line.data('smilisting');

                        $line.find('td.renameable').each(function () {
                            $(this).triggerHandler('renamecell-smilisting', data);
                        });
                    },
                    values: function() {
                        var $inputs = $line.find('input.renaming');

                        if (!$inputs.length) {
                            return undefined;
                        };

                        var data = $line.data('smilisting');
                        var values = {id: data['id']};

                        $inputs.each(function () {
                            var $input = $(this);
                            values[$input.attr('name')] = $input.val();
                        });
                        return values;
                    }
                });

                line.update(data);
                $line.data('smilisting-line', line);
                insert_line($line, data, data.position);
                return $line.get(0);
            };

            $.extend(api, {
                title: configuration.title,
                add: function(lines, initial) {
                    var deferred = $.Deferred();
                    if (lines.length) {
                        if (!initial) {
                            api.$table.children('.empty').remove();
                        };
                        // For setting column widths, set column groups.
                        api.$table.prepend("<colgroup>" +
                                       Array(configuration.columns.length + 1).join("<col></col>") +
                                       "</colgroup>");

                        this.add = function(lines) {
                            return api.worker.add(lines, render_line);
                        };
                        return api.add(lines);
                    } else if (initial) {
                        // Add a message no lines.
                        api.$table.append(
                            '<tr class="empty"><td colpsan="' + configuration.columns.length + '">There are no items here.</td></tr>');
                    };
                    deferred.resolve([]);
                    return deferred.promise();
                },
                $container: null,
                $table: null
            });

            return $.extend({
                template_append: true,
                jsont: '<dt class="ui-state-default"><ins class="ui-icon ui-icon-triangle-1-s"></ins>{title}</dt><dd><table class="static"><tbody></tbody></table></dd>',
                render: function($content) {
                    api.$table = $content.find('table');
                    api.$container = api.$table.find('tbody');

                    // Items header
                    toggle_header($content.filter('dt'), $content.filter('dd'), configuration);

                    // Bind table sort if needed
                    if (api.sort) {
                        sort_items(api.$container, api.$table, api.sort);
                    };
                    return api.add(data.items, true);
                }
            }, api);
        }
    });

})(jQuery, infrae, jsontemplate);
