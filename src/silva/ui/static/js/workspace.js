
(function($, infrae) {

    // Generic views.

    infrae.views.view({
        iface: 'preview',
        name: 'content',
        factory: function($content, data, smi) {
            return {
                data_template: true,
                iframe: true,
                nocache: true,
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
                    smi.open_screen(data.path, data.tab);
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
                    var message = $('<div></div>');

                    if (data.title) {
                        message.attr('title', data.title);
                    };
                    message.html(data.message);
                    message.dialog({
                        modal: true,
                        buttons: {
                            Ok: function() {
                                $(this).dialog('close');
                            }
                        }
                    });
                }
            };
        }
    });

    // Header views.

    infrae.views.view({
        iface: 'title',
        factory: function($content, data) {
            return {
                jsont: '<ins class="icon"></ins>{data.title}',
                render: function() {
                    infrae.ui.icon($content.children('ins'), data.icon);
                }
            };
        }
    });

    infrae.views.view({
        iface: 'menu',
        factory: function($content, data, tabsmode) {
            var create = function(info) {
                var $tab = $('<li><a><span>' + info.name + '</span></a></li>');
                var $link = $tab.children('a');

                if (info.screen) {
                    $link.addClass('open-screen');
                    $link.attr('rel', info.screen);
                } else if (info.action) {
                    $link.addClass('open-action');
                    $link.attr('rel', info.action);
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
                return $tab;
            };

            var bind = function($container, $trigger) {
                var opened = false;

                var close_menu = function() {
                    if (opened) {
                        $container.fadeOut('fast');
                        opened = false;
                    };
                };

                // When a menu is opened or the mouse leave our, we close the menu.
                $content.bind('open-menu', close_menu);
                $container.bind('mouseleave', close_menu);

                $trigger.bind('click', function () {
                    $container.trigger('open-menu');
                    $container.toggle();
                    opened = true;
                    return false;
                });
            };

            return {
                render: function() {
                    $.each(data.entries, function(i, info) {
                        var $tab = create(info, true);
                        var $link = $tab.children('a');

                        if (tabsmode) {
                            if (info.screen) {
                                $link.addClass('top-screen');
                            } else {
                                $link.addClass('top-label');
                            };
                            $link.addClass('top-entry');
                            $tab.addClass('top-level');
                        };

                        if (info.entries) {
                            var $container = $('<ol></ol>');
                            var $opener = $('<div class="subtab-icon"><ins></ins></div>');

                            $.each(info.entries, function(i, entry) {
                                $container.append(create(entry));
                            });

                            bind($container, info.screen ? $opener : $link);

                            $link.prepend($opener);
                            $tab.append($container);
                        };
                        $content.append($tab);
                    });
                    if (!tabsmode) {
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
            return {
                render: function() {
                    var $metadata = $content.children('.metadata');
                    var $parent = $content.find('a.parent');

                    // Update header
                    $metadata.children('h2').render({data: data.title});
                    $metadata.children('.content-tabs').render(
                        {data: data.menu.content, args: [true]});
                    $metadata.find('.view-actions ol').render(
                        {data: data.menu.view});
                    $content.children('.toolbar').render(
                        {data: data, name: 'toolbar', args: [smi, view]});

                    // Update content link hidden link
                    $metadata.children('#content-url').attr('href', url.expand({path: data.path}));

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
                    infrae.ui.selection.enable($content);
                }
            };
        }
    });

})(jQuery, infrae);

