
(function($) {

    obviel.view({
        iface: 'title',
        jsont: '<ins class="icon"></ins>{data.title}',
        render: function(content, data) {
            var $icon = this.$content.children('ins');

            if (data.icon.indexOf('.') < 0) {
                $icon.addClass(data.icon);
            } else {
                $icon.attr(
                    'style',
                    'background:url(' + data.icon + ') no-repeat center center;');
            };
        }
    });

    obviel.view({
        iface: 'menu',
        create: function(info, base) {
            if (base === undefined)
                base = '<li><a/></li>';
            var tab = $(base);
            var link = $('a', tab);
            link.text(info.name);
            if (info.screen) {
                link.addClass('open-screen');
                link.attr('rel', info.screen);
                if (info.active) {
                    link.addClass('active');
                };
            } else if (info.action) {
                link.addClass('open-action');
                link.attr('rel', info.action);
            };
            if (info.description) {
                link.attr('title', info.description);
            };
            if (info.accesskey) {
                link.attr('accesskey', info.accesskey);
            };
            return tab;
        },
        render: function() {
            $.each(this.data.entries, function(i, info) {
                var tab = this.create(info,
                    '<li><div class="outer"><div class="inner"><a/></div></div></li>');

                if (info.entries) {
                    var container = $('<ol class="subtabs"></ol>');
                    var link = $('a', tab);
                    var is_current = link.hasClass('active');

                    $.each(info.entries, function(i, entry) {
                        container.append(this.create(entry));
                    }.scope(this));
                    tab.addClass('openable');
                    $('div.outer', tab).append(container);
                    $('div.inner', tab).prepend('<ins/>');
                    container.bind('mouseleave', function() {
                        container.fadeOut('fast');
                    });
                    $('ins', tab).bind('click', function () {
                        container.show();
                        return false;
                    });
                };
                this.$content.append(tab);
            }.scope(this));
        },
        cleanup: function() {
            this.$content.empty();
        }
    });

    obviel.view({
        iface: 'object',
        name: 'header',
        render: function() {
            var metadata = this.data.metadata;
            var  $parent = this.$content.find('a.parent');

            // Update header
            this.$content.children('h2').render({data: metadata.title});
            this.$content.children('.content-tabs').render(
                {data: metadata.menu.content});
            this.$content.find('.view-actions ol').render(
                {data: metadata.menu.view});
            this.$content.children('.toolbar').render(
                {data: this.data, name: 'toolbar', extra: {smi: this.smi, view: this.view}});

            // Update content link hidden link
            this.$content.children('#content-url').attr('href', this.url.expand({path: metadata.path}));

            // Update parent link
            if (metadata.up != null) {
                $parent.attr('href', metadata.up ||'/');
                $parent.attr('rel', this.smi.opened.tab);
                $parent.removeClass('ui-state-disabled');
                $parent.addClass('ui-state-default');
            } else {
                $parent.addClass('ui-state-disabled');
                $parent.removeClass('ui-state-default');
            };
        }
    });

    obviel.view({
        iface: 'object',
        name: 'toolbar',
        html: '<div class="actions content-actions"><ol></ol></div>',
        render: function() {
            this.$content.find('.content-actions ol').render(
                {data: this.data.metadata.menu.actions});
        }
    });

    obviel.view({
        iface: 'preview',
        name: 'content',
        iframe: true,
        nocache: true,
        cleanup: function() {
            this.$content.empty();
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

        // Disable text selection
        $header.disableTextSelect();

        // New workspace is loaded
        $workspace.bind('content-smi', function (event, data) {
            // Update content area
            $content.render({
                data: data.content,
                name: 'content',
                extra: {smi: smi},
                onrender: function(view) {
                    $header.render({
                        data: data.content,
                        name: 'header',
                        extra: {smi: smi, url: url, view: view}});
                }});
        });
    };

})(jQuery, obviel);

