
(function($) {

    obviel.view({
        iface: 'title',
        render: function(content, data) {
            var icon = $('<ins class="icon"></ins>');

            if (data.icon.indexOf('.') < 0) {
                icon.addClass(data.icon);
            } else {
                icon.attr(
                    'style',
                    'background:url(' + data.icon + ') no-repeat center center;');
            };
            content.text(data.title);
            content.prepend(icon);
        }
    });

    obviel.view({
        iface: 'menu',
        create: function(info) {
            var tab = $('<li class="entry"><a class="screen ui-state-default">' + info.name + '</a></li>');
            var link = tab.children('a');

            link.attr('rel', info.action);
            if (info.action == this.data.active) {
                link.addClass('active');
            };
            return tab;
        },
        render: function() {
            $.each(this.data.entries, function(i, info) {
                var tab = this.create(info);

                if (info.entries) {
                    var container = $('<ol class="subtabs"></ol>');
                    var link = tab.children('a');
                    var is_current = link.hasClass('active');

                    $.each(info.entries, function(i, entry) {
                        container.append(this.create(entry));
                    }.scope(this));
                    tab.addClass('openable');
                    tab.append(container);
                    link.prepend('<ins class="ui-icon ui-icon-triangle-1-s"></ins>');
                    container.bind('mouseleave', function() {
                        container.fadeOut();
                        if (!is_current) {
                            link.removeClass('active');
                        };
                    });
                    link.bind('click', function () {
                        container.fadeToggle();
                        if (!is_current) {
                            link.toggleClass('active');
                        };
                        return false;
                    });
                };
                this.content.append(tab);
            }.scope(this));
        },
        cleanup: function() {
            this.content.empty();
        }
    });

    obviel.view({
        iface: 'metadata',
        render: function() {
            var  parent_link = this.content.find('a.parent');

            // Update header
            this.content.children('h3').render({data: this.data.title});
            this.content.children('.content-tabs').render({data: this.data.menu.content});
            this.content.children('.settings-tabs').render({data: this.data.menu.settings});
            this.content.children('.actions').render({data: this.data.menu.view});

            // Update content link hidden link
            this.content.children('#content-url').attr('href', this.url.expand({path: this.data.path}));

            // Update parent link
            if (this.data.up != null) {
                parent_link.attr('href', this.data.up ||'/');
                parent_link.attr('rel', this.smi.opened.tab);
                parent_link.removeClass('ui-state-disabled');
                parent_link.addClass('ui-state-default');
            } else {
                parent_link.addClass('ui-state-disabled');
                parent_link.removeClass('ui-state-default');
            };
        }
    });

    obviel.view({
        iface: 'preview',
        name: 'content',
        iframe: true,
        nocache: true,
        cleanup: function() {
            this.content.empty();
        }
    });

    var SMIWorkspace = function(workspace, smi, options) {
        this._ = smi;
        this.workspace = workspace;
        this.options = options;
        var url = jsontemplate.Template(options.url, {});

        // Disable text selection
        workspace.children('.info').disableTextSelect();

        // Bind the settings display tool
        {
            var settings_switcher = workspace.find('.admin-tabs a.settings');
            var settings_menu = workspace.find('.settings-tabs');
            var content_menu = workspace.find('.content-tabs');

            settings_switcher.bind('click', function() {
                if (content_menu.is(':visible')) {
                    content_menu.hide();
                    settings_menu.show();
                    settings_switcher.toggleClass('active');
                } else {
                    content_menu.show();
                    settings_menu.hide();
                    settings_switcher.toggleClass('active');
                };
                return false;
            });
        };

        // New workspace is loaded
        workspace.bind('content-smi', function (event, data) {
            var workspace = $(this);
            var info = workspace.children('.info');
            var content = workspace.children('.content');

            // Update content area
            info.render({data: data.metadata, extra: {smi: smi, url: url}});
            content.render({data: data.content, name:'content', extra: {smi: smi}});
        });
    };

    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMIWorkspace = function(smi, options) {
        return new SMIWorkspace(this, smi, options);
    };

})(jQuery, obviel);

