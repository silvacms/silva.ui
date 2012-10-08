
(function($, infrae) {

    // Generic views.

    infrae.views.view({
        iface: 'preview',
        name: 'content',
        factory: function($content, data, smi) {
            return {
                template_data: true,
                template_nocache: true,
                iframe: true,
                cleanup: function() {
                    $content.empty();
                }
            };
        }
    });

    infrae.views.view({
        iface: 'redirect',
        factory: function($content, data, smi) {
            return {
                render: function() {
                    smi.open_screen(data.path, data.screen);
                }
            };
        }
    });

    infrae.views.view({
        iface: 'view',
        factory: function($content, data, smi) {
            return {
                render: function() {
                    window.open(data.url);
                }
            };
        }
    });

    infrae.views.view({
        iface: 'message',
        factory: function($content, data, smi) {
            return {
                render: function() {
                    return infrae.ui.ConfirmationDialog({
                        title: data.title,
                        message: data.message,
                        not_cancellable: true});
                }
            };
        }
    });

    // Header views.

    infrae.views.view({
        iface: 'title',
        factory: function($content, data, smi) {
            return {
                jsont: '<ins class="icon"></ins>{data.title|html}',
                render: function() {
                    var name = "Silva";
                    if (smi.options.theme && smi.options.theme.name) {
                        name = smi.options.theme.name;
                    };
                    infrae.ui.icon($content.children('ins'), data.icon);
                    $('head > title').html(name + " - " + data.title);
                }
            };
        }
    });

    infrae.views.view({
        iface: 'menu',
        factory: function($content, data) {
            var tabs = $content.hasClass('tabs');
            var $opened = $([]);

            var create = function(info, top_level) {
                var $tab = $('<li><a></a></li>');
                var $link = $tab.children('a');

                if (tabs) {
                    if (top_level) {
                        if (info.screen) {
                            $link.addClass('top-screen');
                        } else {
                            $link.addClass('top-label');
                        };
                        $link.addClass('top-entry');
                        $tab.addClass('top-level');
                    } else {
                        $tab.addClass('sub-level');
                    };
                };
                if (info.name) {
                    $link.html('<span>' + info.name + '</span>');
                } else if (info.logo) {
                    $link.html('<ins class="tab-logo ' + info.logo + '"/>');
                };
                if (info.screen) {
                    $link.addClass('open-screen');
                    $link.attr('rel', info.screen);
                } else if (info.action) {
                    $link.addClass('open-action');
                    $link.attr('rel', info.action);
                } else if (info.url) {
                    $link.attr('href', info.url);
                    if (info.target) {
                        $link.attr('target', info.target);
                    };
                };
                if (info.icon && !tabs) {
                    $link.addClass('ui-state-default');
                    $link.prepend(
                        '<div class="action-icon"><ins class="ui-icon ui-icon-' +
                            info.icon + '"></ins></div>');
                };
                if (info.active) {
                    $link.addClass('active');
                };
                if (info.description) {
                    $link.attr('title', info.description);
                };
                if (info.accesskey) {
                    $link.attr('accesskey', info.accesskey);
                };
                if (info.entries) {
                    var $container = $('<ol class="subtabs"></ol>');
                    var $opener = $('<div class="subtab-icon"><ins></ins></div>');
                    var $trigger = info.screen && top_level ? $opener : $link;

                    var close = function(exclude) {
                        var contained = [];
                        var uncontained = [];
                        var container = $container.get(0);

                        $opened.each(function() {
                            if ((this === container && !exclude) || $.contains(this, container)) {
                                contained.push(this);
                            } else {
                                uncontained.push(this);
                            };
                        });
                        $(uncontained).fadeOut('fast');
                        $opened = $(contained);
                        if (!exclude) {
                            $opened = $(contained).add(container);
                        } else {
                            $opened = $(contained);
                        };
                    };

                    $.each(info.entries, function(i, entry) {
                        $container.append(create(entry));
                    });

                    $container.bind('mouseleave', function () {
                        close(true);
                    });

                    $trigger.bind(top_level ? 'click' : 'mouseenter', function () {
                        var origin = $link.offset().left;
                        var width = $container.width();
                        var available = $(document).width();

                        if (!top_level) {
                            var padding = $link.width();
                            if (origin + padding + width < available) {
                                $container.css('left', padding);
                            } else {
                                $container.css('right', width - 5);
                            };
                            $container.css('top', 0);
                        } else {
                            if (origin + width < available) {
                                $container.css('left', 0);
                            } else {
                                $container.css('right', 0);
                            };
                        };
                        close(false);
                        $container.show();
                        return false;
                    });

                    $link.prepend($opener);
                    $tab.append($container);
                };
                return $tab;
            };

            return {
                render: function() {
                    $.each(data.entries, function(i, info) {
                        $content.append(create(info, true));
                    });
                    $content.tipsy({delegate: 'a'});
                    if (!tabs) {
                        // Add a class for style under IE 8
                        $content.children('li:last').addClass('last-action');
                    };
                },
                cleanup: function() {
                    $content.unbind('open-menu');
                    $content.empty();
                }
            };
        }
    });

    infrae.views.view({
        iface: 'object',
        name: 'header',
        factory: function($content, data, smi, url, view) {
            var make_menu = function($menu, data) {
                if (data) {
                    ($menu.is('ol') ? $menu : $menu.find('ol')).render({data: data});
                    $menu.show();
                } else {
                    $menu.hide();
                };
            };
            var make_all_menu = function($metadata, data, compact) {
                // Mode pas compact
                if (!compact) {
                    make_menu($metadata.find('.view-actions'), data.view);
                    make_menu($metadata.children('.content-tabs'), data.content);
                    make_menu($metadata.find('.compact-tabs'), undefined);
                } else {
                    var entries = [];

                    if (data.content) {
                        entries = entries.concat(data.content.entries);
                    };
                    if (data.view) {
                        entries = entries.concat(data.view.entries);
                    };
                    make_menu($metadata.find('.view-actions'), undefined);
                    make_menu($metadata.children('.content-tabs'), undefined);
                    make_menu(
                        $metadata.find('.compact-tabs'), {
                            ifaces: ['menu'],
                            entries: [{
                                logo: "tab-options",
                                active: true,
                                entries: entries
                            }]
                        });
                };
            };

            return {
                render: function() {
                    var $metadata = $content.children('.metadata');
                    var $parent = $content.find('a.parent');
                    var compact = $content.hasClass('compact-header');

                    // Update header
                    $metadata.children('h2').render({data: data.title, args: [smi, view]});
                    $metadata.children('#content-url').attr('href', url.expand({path: data.path}));

                    make_all_menu($metadata, data.menu, compact);

                    $content.children('.toolbar').render(
                        {data: data, name: 'toolbar', args: [smi, view]});

                    // Update parent link
                    if (data.up != null) {
                        $parent.attr('href', data.up ||'/');
                        $parent.attr('rel', smi.opened.tab);
                        $parent.removeClass('ui-state-disabled');
                        $parent.addClass('ui-state-default');
                    } else {
                        $parent.addClass('ui-state-disabled');
                        $parent.removeClass('ui-state-default');
                    };

                    $(window).bind('fullscreen-resize-smi.default-header', function(event, info) {
                        make_all_menu($metadata, data.menu, info.active);
                    });
                },
                cleanup: function() {
                    $(window).unbind('fullscreen-resize-smi.default-header');
                }
            };
        }
    });

    infrae.views.view({
        iface: 'object',
        name: 'toolbar',
        factory: function($content, data) {
            return {
                render: function() {
                    var actions = data.menu.actions;

                    if (actions && actions.entries.length) {
                        $content.html('<div class="actions content-actions"><ol></ol></div>');
                        infrae.ui.selection.disable($content);
                        $content.find('.content-actions ol').render({data: actions});
                    };
                },
                cleanup: function() {
                    $content.empty();
                    infrae.ui.selection.enable($content);
                }
            };
        }
    });

})(jQuery, infrae);
