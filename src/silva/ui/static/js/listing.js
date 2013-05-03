

(function($, infrae, jsontemplate) {

    /**
     * Manage a selector that can unselect / select all
     * element in a listing, and view selection status.
     * @param $selector: JQuery object representing the selector
     * @param listing: managed listing
     */
    var render_multi_selector = function($selector, listing, shortcuts) {
        var status = 'none';

        var set_status = function(new_status) {
            $selector.removeClass(status);
            $selector.addClass(new_status);
            status = new_status;
        };

        // Update selector style on selection change
        listing.events.status(function() {
            if (this.selection.length == 0) {
                set_status('none');
            } else if (this.selection.length == this.length) {
                set_status('all');
            } else if (this.selection.length == 1) {
                set_status('single');
            } else {
                set_status('partial');
            };
        });

        var switch_status = function() {
            if (status == 'none') {
                listing.select_all();
            } else {
                listing.unselect_all();
            };
            return false;
        };
        var clear_status = function() {
            listing.unselect_all();
            return false;
        };

        // Clicking on the selector change the selection.
        $selector.bind('click', switch_status);
        shortcuts.bind('listing', null, ['ctrl+a'], switch_status);
        shortcuts.bind('listing', null, ['esc'], clear_status);
    };

    /**
     * Render/bind top listing header.
     * @param $content: listing JQuery element.
     * @param configuration: listing configuration.
     */
    var render_listing_header = function($content, configuration, listing, shortcuts) {
        var first_configuration = configuration.listing[0];
        var $table = $content.find('div.listing-header table');
        var $header = $table.find('tr');

        $table.prepend("<colgroup>" +
                       Array(first_configuration.columns.length + 1).join("<col></col>") +
                       "</colgroup>");

        $.each(first_configuration.columns, function(index, column) {
            var $cell = $('<th></th>');

            if (!index) {
                $cell.html('<div class="selector"><ins class="none"></ins></div>');
                render_multi_selector($cell.find('ins'), listing, shortcuts);
            };
            if (column.caption) {
                $cell.text(column.caption);
            };
            $header.append($cell);
        });

        infrae.ui.selection.disable($header);
    };


    /**
     * Render/bind the user selection process.
     */
    var render_selection = function($viewport, $containers, selector, smi) {
        // Row selection
        var last_selected_index = null;
        var $hovered_row = null;
        var shortcuts = smi.shortcuts;

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
        var mouved_mouse = true;

        // Set the hover column on hovering if we mouved the mouse
        $containers.bind('mousemove', function () {
            mouved_mouse = true;
        });
        $containers.delegate('tr.item', 'mouseenter', function() {
            if (mouved_mouse) {
                set_hovered_row($(this));
            };
        });
        $containers.delegate('tr.item', 'mouseleave', function() {
            if (mouved_mouse) {
                clear_hovered_row();
            };
        });
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

        // Disable click, we will use mousedown events to be compatible with drag and drop.
        $containers.delegate('tr.item', 'click', false);

        // Drop-downs support (for the goto menu).
        var opened_dropdown = null;
        $containers.delegate('tr.item div.dropdown', 'mouseleave', function(event) {
            if (opened_dropdown !== null) {
                opened_dropdown.fadeOut('fast');
                opened_dropdown = null;
            };
        });
        $containers.delegate('tr.item div.dropdown-icon', 'mousedown', function(event) {
            if (opened_dropdown !== null) {
                opened_dropdown.fadeOut('fast');
            };
            opened_dropdown = $(event.target).parents('a').next();
            opened_dropdown.fadeToggle();
            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        // Action, follow a link.
        $containers.delegate('tr.item a.open-screen', 'mousedown', function(event) {
            smi.open_screen_from_link($(event.currentTarget));
            event.stopPropagation();
            event.preventDefault();
            return false;
        });

        // Tip
        $containers.tipsy({gravity: 'w', delegate: 'ins.state'});

        // Row selection with mouse
        // INFO: Binding mousedown integrate it well with column drag
        // and drop and prevent browser text-selection on some browsers.
        $containers.delegate('tr.item', 'mousedown', function(event) {
            var target = $(event.target);
            if (target.is('input[type="text"]')) {
                target.focus();
                return;
            };
            select_row($(this), event.shiftKey);
            event.preventDefault();
            event.stopPropagation();
            return false;
        });
        // Row selection with keyboard
        shortcuts.bind('listing', null, ['space', 'shift+space'], function(event) {
            select_row(get_hovered_row(), event.shiftKey);
            return false;
        });

        // Scroll a line into view. This is used with the keyboard
        var scroll_line_into_view = function($line) {
            var top = $line.position().top;
            var height = $line.outerHeight();
            var target, limit;

            if (top < 25) {
                target = $viewport.scrollTop() - 25 + top;
                infrae.ui.scroll($viewport, 'fast', 'absolute', target);
            } else {
                limit = $viewport.innerHeight() - height - 25;
                if (top > limit) {
                    target = $viewport.scrollTop() + (top - limit);
                    infrae.ui.scroll($viewport, 'fast', 'absolute', target);
                };
            };
        };

        // Row movement with keyboard
        shortcuts.bind('listing', null, ['up', 'shift+up'], function(event) {
            var $row = get_hovered_row();
            var $candidate = $row.prev();

            while ($candidate.length && !$candidate.is(':visible'))
                $candidate = $candidate.prev();
            if ($candidate.length) {
                mouved_mouse = false;
                set_hovered_row($candidate);
                if (event.shiftKey)
                    select_row($candidate);

                scroll_line_into_view($candidate);
            };
            return false;
        });
        shortcuts.bind('listing', null, ['down', 'shift+down'], function(event) {
            var $row = get_hovered_row();
            var $candidate = $row.next();

            while ($candidate.length && !$candidate.is(':visible'))
                $candidate = $candidate.next();
            if ($candidate.length) {
                mouved_mouse = false;
                set_hovered_row($candidate);
                if (event.shiftKey)
                    select_row($candidate);

                scroll_line_into_view($candidate);
            };
            return false;
        });
    };

    var worker = infrae.deferred.LazyCallbacks();

    var get_dom_line = function(id) {
        return document.getElementById('list' + id.toString());
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

        infrae.views.view({
            iface: 'listing',
            name: 'content',
            factory: function($content, data, smi) {
                var listing = {};
                var selection = infrae.smi.listing.Selection();
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
                                rename: {
                                    rename: function(deferred) {
                                        if (selection.rename(deferred))
                                            transaction.require(events.status.invoke);
                                    },
                                    collect: function(success) {
                                        selection.collect(success);
                                        transaction.require(events.status.invoke);
                                    }
                                },
                                listing: {
                                    add: function(data, select) {
                                        var promises = [];

                                        for (var name in by_name) {
                                            var lines = data[name];

                                            if (lines && lines.length) {
                                                promises.push(by_name[name].add(lines));
                                            };
                                        };
                                        if (promises.length) {
                                            return $.when.apply(null, promises).then(function (lines) {
                                                var $added = $(lines);

                                                if ($added.length) {
                                                    selection.select($added);
                                                    transaction.require(events.content.invoke);
                                                    transaction.require(events.status.invoke);
                                                };
                                                return $added;
                                            });
                                        };
                                        return null;
                                    },
                                    update: function(lines) {
                                        if (lines.length) {
                                            return worker.add(lines, function(data) {
                                                var line = get_dom_line(data['id']);
                                                $(line).data('smilisting-line').update(data);
                                                return line;
                                            }).then(function(lines) {
                                                transaction.require(events.status.invoke);
                                                return $(lines);
                                            });
                                        };
                                        return null;
                                    },
                                    remove: function(ids) {
                                        var $lines = get_lines(ids);

                                        if ($lines.length) {
                                            selection.remove($lines);
                                            transaction.require(events.content.invoke);
                                            transaction.require(events.status.invoke);
                                        };
                                        return null;
                                    }
                                },
                                clipboard: {
                                    cut: function(data) {
                                        smi.clipboard.cut(data);
                                        transaction.require(events.status.invoke);
                                        return null;
                                    },
                                    copy: function(data) {
                                        smi.clipboard.copy(data);
                                        transaction.require(events.status.invoke);
                                        return null;
                                    },
                                    update: function(data) {
                                        smi.clipboard.update(data);
                                        transaction.require(events.status.invoke);
                                    },
                                    remove: function(data) {
                                        smi.clipboard.remove(data);
                                        transaction.require(events.status.invoke);
                                        return null;
                                    },
                                    clear: function() {
                                        smi.clipboard.clear();
                                        return null;
                                    }
                                }
                            });
                            return transaction;
                        },
                        query: configuration.query
                    });
                    return status;
                });

                var update_container_sizes = function() {
                    var $header = $content.find('div.listing-header table');
                    var $reference = null;
                    var layout = null;
                    var others = [];
                    var other_layouts = [];

                    infrae.utils.each(configuration.listing, function(section) {
                        var container = by_name[section.name];
                        var $table;

                        if (container === undefined) {
                            return;
                        };
                        $table = container.$table;

                        if ($table.is(':visible') && $table.find('tr.item').length) {
                            if ($reference === null) {
                                $reference = $table;
                                layout = section.layout;
                            } else {
                                others.push($table);
                                other_layouts.push(section.layout);
                            };
                        };
                    });

                    if ($reference !== null) {
                        var update = infrae.ui.update_table_columns;

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
                        if (value) {
                            var pattern = new RegExp(value, 'i');

                            $.each(configuration.listing, function(i, configuration) {
                                var $container = by_name[configuration.name].$container;
                                var $table = by_name[configuration.name].$table;

                                $table.addClass('filtering');
                                $container.children('.item').each(function (i) {
                                    var $line = $(this);

                                    if (configuration.filter(pattern, $line.data('smilisting'))) {
                                        $line.show();
                                    } else {
                                        $line.hide();
                                    };
                                });
                            });
                        } else {
                            // Filtering is over, show all lines
                            $.each(configuration.listing, function(i, configuration) {
                                var $container = by_name[configuration.name].$container;
                                var $table = by_name[configuration.name].$table;

                                $table.removeClass('filtering');
                                $container.children('.item').show();
                            });
                        };
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
                        var $listing = $content.find('dl.listing');

                        // Shortcut
                        smi.shortcuts.create('listing', $content, true);

                        // Render header
                        render_listing_header($content, configuration, listing, smi.shortcuts);

                        // Create containers
                        var promises = [];

                        $.each(configuration.listing, function(i, configuration) {
                            var api = {worker: worker};

                            if (configuration.content_match &&
                                !infrae.utils.test(data.content, configuration.content_match)) {
                                return;
                            };

                            if (configuration.sortable &&
                                infrae.utils.test(data.content, configuration.sortable.content_match)) {
                                api.sort = configuration.sortable.sort;
                            };

                            promises.push(
                                infrae.views.render(
                                    $listing,
                                    {data: data.items[configuration.name],
                                     name: 'listing-container',
                                     args: [configuration, api]}));

                            $containers = $containers.add(api.$container);
                            by_name[configuration.name] = api;
                        });

                        // Selection
                        render_selection(
                            $listing,
                            $containers,
                            function ($items) {
                                if (selection.toggle($items)) {
                                    events.status.invoke();
                                };
                            },
                            smi);

                        // Then collpasing change, update column sizes, and trigger a new status.
                        update_container_sizes();
                        $content.bind('collapsingchange-smilisting', function() {
                            update_container_sizes();
                            events.status.invoke();
                        });

                        $.when.apply(null, promises).done(function () {
                            // Update the listing column sizes
                            update_container_sizes();
                            // Render footer
                            $content.find('.listing-footer').render(
                                {data: data, name: 'footer', args: [smi, listing]});
                        });
                    },
                    cleanup: function() {
                        worker.reset();
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
            success: function(configuration) {
                var url_template = new jsontemplate.Template(smi.options.listing.action, {});

                // Register content interfaces.
                for (var iface in configuration.ifaces) {
                    infrae.interfaces.register(iface, configuration.ifaces[iface]);
                };

                $.extend(configuration, {
                    query: function(action, data) {
                        return smi.ajax.query(
                            url_template.expand({path: smi.opened.path, action: action}),
                            data);
                    }
                });

                // Add some usefull methods to the configuration object.
                $.each(configuration.listing, function(i, section) {
                    // Add filter function
                    var names = [];

                    $.each(section.columns, function(e, column) {
                        if (column.filterable) {
                            names.push(column.name);
                        };
                    });

                    $.extend(section, {
                        filter: function(pattern, data) {
                            for (var i=0, len=names.length; i < len; i++) {
                                if (data[names[i]].match(pattern))
                                    return true;
                            };
                            return false;
                        }
                    });
                    if (section.sortable) {
                        $.extend(section.sortable, {
                            sort: function(data) {
                                return configuration.query(section.sortable.action, data);
                            }
                        });
                    }
                });

                // Load smilisting.
                $(document).trigger('load-smilisting', {smi: smi, configuration: configuration});
            }
        });
    });

    infrae.smi.listing = {};

})(jQuery, infrae, jsontemplate);
