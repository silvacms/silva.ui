
(function($) {

    obviel.iface('title');
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
    obviel.iface('menu');
    obviel.view({
        iface: 'menu',
        create: function(info) {
            var tab = $('<li><a class="screen ui-state-default">' + info.name + '</a></li>');
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

                    $.each(info.entries, function(i, entry) {
                        container.append(this.create(entry));
                    }.scope(this));
                    tab.addClass('openable');
                    tab.append(container);
                    link.prepend('<ins class="ui-icon ui-icon-triangle-1-s"></ins>');
                    container.bind('mouseleave', function() {
                        container.fadeOut();
                    });
                    link.bind('click', function () {
                        container.fadeToggle();
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

    var SMIWorkspace = function(workspace, smi, options) {
        this._ = smi;
        this.workspace = workspace;
        this.options = options;
        var url = jsontemplate.Template(options.url, {});

        // Disable text selection
        workspace.children('.info').disableTextSelect();

        // New workspace is loaded
        workspace.bind('content-smi', function (event, data) {
            var workspace = $(this);
            var info = workspace.children('.info');
            var content = workspace.children('.content');

            // Update header
            info.children('h3').render({data: data.metadata.title});
            info.children('.tabs').render({data: data.metadata.left});
            info.children('.actions').render({data: data.metadata.right});
            info.children('#content-url').attr(
                'href', url.expand({path: data.metadata.path}));

            // Update content area
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

