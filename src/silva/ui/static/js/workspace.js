
(function($, infrae) {

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

                            $container.bind('mouseleave', function() {
                                $container.fadeOut('fast');
                            });
                            if (info.screen) {
                                $opener.bind('click', function () {
                                    $container.toggle();
                                    return false;
                                });
                            } else {
                                $link.bind('click', function () {
                                    $container.toggle();
                                    return false;
                                });
                            };

                            $link.prepend($opener);
                            $tab.append($container);
                        };
                        $content.append($tab);
                    });
                },
                cleanup: function() {
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
                    var metadata = data.metadata;
                    var $metadata = $content.children('.metadata');
                    var $parent = $content.find('a.parent');

                    // Update header
                    $metadata.children('h2').render({data: metadata.title});
                    $metadata.children('.content-tabs').render(
                        {data: metadata.menu.content, args: [true]});
                    $metadata.find('.view-actions ol').render(
                        {data: metadata.menu.view});
                    $content.children('.toolbar').render(
                        {data: data, name: 'toolbar', args: [smi, view]});

                    // Update content link hidden link
                    $metadata.children('#content-url').attr('href', url.expand({path: metadata.path}));

                    // Update parent link
                    if (metadata.up != null) {
                        $parent.attr('href', metadata.up ||'/');
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
                    var actions = data.metadata.menu.actions;

                    if (actions && actions.entries.length) {
                        $content.html('<div class="actions content-actions"><ol></ol></div>');
                        $content.disableTextSelect();
                        $content.find('.content-actions ol').render({data: actions});
                    };
                },
                cleanup: function() {
                    $content.enableTextSelect();
                }
            };
        }
    });

    infrae.views.view({
        iface: 'preview',
        name: 'content',
        factory: function($content, data) {
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

    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMIWorkspace = function(smi, options) {
        var $workspace = $(this);
        var url = jsontemplate.Template(options.url, {});
        var $header = $workspace.children('.header');
        var $content = $workspace.children('.content');

        // Disable text selection in metadata
        $header.children('.metadata').disableTextSelect();

        // New workspace is loaded
        $workspace.bind('content-smi', function (event, data) {
            // Update content area
            $content.render({
                data: data.content,
                name: 'content',
                args: [smi]
            }).done(function() {
                $header.render({
                    data: data.content,
                    name: 'header',
                    args: [smi, url, this]});
            });
        });
    };

})(jQuery, infrae);

