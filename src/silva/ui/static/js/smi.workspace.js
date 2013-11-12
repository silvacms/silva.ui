
(function($, jsontemplate, infrae) {

    var SCROLLBARS_SIZE = 0;

    $(document).ready(function() {
        SCROLLBARS_SIZE = (function() {
            var $scroll_div = $('<div style="width:100px; height:50px; position:absolute; top:-9999px; left:-9999px; visibility:hidden; overflow:hidden;"><div style="width:100%; height:100px;"></div></div>'),
                outer_width,
                sb_width;

            $('body').append($scroll_div);
            outer_width = $scroll_div[0].offsetWidth;
            $scroll_div.css('overflow', 'scroll');
            sb_width = outer_width - $scroll_div[0].clientWidth;
            $scroll_div.remove();
            return sb_width;
        })();
    });

    // Generic views.
    infrae.views.view({
        iface: 'preview',
        name: 'content',
        factory: function($content, data, smi) {
            var resolution_fixed = false,
                resolution_height = 0,
                resolution_width = 0,
                max_height = 0,
                max_width = 0;

            var resize = function($iframe) {
                $iframe.height(Math.min(max_height, resolution_height));
                $iframe.width(Math.min(max_width, resolution_width));
            };
            return {
                template_data: true,
                template_nocache: true,
                iframe: true,
                resize_iframe: function(width, height) {
                    max_width = width;
                    max_height = height;
                    if (resolution_fixed) {
                        resize(this.$iframe);
                        return true;
                    };
                    return false;
                },
                set_resolution: function(width, height) {
                    resolution_fixed = true;
                    resolution_height = height;
                    resolution_width = +width + SCROLLBARS_SIZE;
                    resize(this.$iframe);
                },
                clear_resolution: function() {
                    resolution_fixed = false;
                    this.$iframe.trigger('resize');
                },
                cleanup: function() {
                    $content.empty();
                }
            };
        }
    });

    infrae.views.view({
        iface: 'preview',
        name: 'toolbar',
        factory: function($content, data, smi, view) {
            var actions = data.menu.actions,
                resolutions = smi.options.preview ? smi.options.preview.resolutions : [],
                have_actions = actions && actions.entries.length;
            return {
                jsont: '{.section have_actions}<div class="actions content-toolbar"><ol></ol></div>{.end}{.section resolutions}<div class="view-toolbar resolution-preview"><select>{.repeated section @}<option value={resolution|htmltag}>{name}</option>{.end}</select></div>{.end}',
                have_actions: have_actions,
                resolutions: resolutions,
                render: function() {
                    if (have_actions) {
                        $content.find('.content-toolbar ol').render({data: actions});
                    };
                    if (resolutions.length) {
                        $content.find('.resolution-preview select').on('change', function() {
                            var value = $(this).attr('value'),
                                resolution = value.match(/(\d*)x(\d*)/);

                            if (resolution) {
                                view.set_resolution(resolution[1], resolution[2]);
                            } else {
                                view.clear_resolution();
                            };
                        });
                    }
                },
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

    var text_template = new jsontemplate.Template(
        '<div id="smi-text"><div class="smi-text-content">{html}</div></div>', {});

    infrae.views.view({
        iface: 'text-overlay',
        factory: function($content, data, smi) {
            var $text = $(text_template.expand(data)),
                $overlay = $('<div class="ui-widget-overlay"></div>');

            var clear = function(event) {
                if (!$(event.target).is('a')) {
                    $text.remove();
                    $overlay.remove();
                    return false;
                };
            };

            return {
                render: function() {
                    $overlay.click(clear);
                    $text.click(clear);
                    $('body').append($overlay);
                    $('body').append($text);
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
                    if (!$.browser.msie) {
                        $('head > title').html(name + " - " + data.title);
                    };
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
                if (info.icon) {
                    var icon_class = 'tab-icon';
                    if (info.action) {
                        icon_class = 'action-icon';
                    }
                    $link.addClass('ui-state-default');
                    $link.prepend(
                        '<div class="'+ icon_class + '"><ins class="ui-icon ui-icon-' +
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
                if (info.trigger) {
                    $link.addClass(info.trigger);
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

                    $container.bind('click', function () {
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
                    infrae.ui.selection.disable($content);
                    if (!tabs) {
                        // Add a class for style under IE 8
                        $content.children('li:last').addClass('last-action');
                    };
                },
                cleanup: function() {
                    $content.unbind('open-menu');
                    $content.unbind('.tipsy');
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
                make_menu($metadata.children('.user-menu'), data.user);

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

                    $content.find('.admin-actions').tipsy({delegate: 'a'});
                    $content.children('.toolbar').render(
                        {data: data, name: 'toolbar', args: [smi, view]});

                    // Update parent link
                    if (data.up) {
                        if (data.up.path) {
                            $parent.attr('href', data.up.path);
                        };
                        $parent.attr('rel', data.up.screen || smi.opening.screen);
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
                    $content.find('.admin-actions').unbind('.tipsy');
                    $(window).unbind('fullscreen-resize-smi.default-header');
                }
            };
        }
    });

    infrae.views.view({
        iface: 'object',
        name: 'toolbar',
        factory: function($content, data) {
            var actions = data.menu.actions,
                have_actions = actions && actions.entries.length;
            return {
                jsont: '{.section have_actions}<div class="actions content-toolbar"><ol></ol></div>{.end}',
                have_actions: have_actions,
                render: function() {
                    if (have_actions) {
                        $content.find('.content-toolbar ol').render({data: actions});
                    };
                },
                cleanup: function() {
                    $content.empty();
                }
            };
        }
    });

})(jQuery, jsontemplate, infrae);
