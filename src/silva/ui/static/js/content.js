
(function($) {

    obviel.iface('title');
    obviel.view(
        new obviel.View({
            iface: 'title',
            render: function(element, data) {
                var title = $(element);
                var icon = $('<ins class="icon"></ins>');

                icon.addClass(data['icon']);
                title.text(data['title']);
                title.prepend(icon);
            }
        })
    );
    obviel.iface('tabs');
    obviel.view(
        new obviel.View({
            iface: 'tabs',
            render: function(element, data) {
                var container = $(element);

                container.empty();
                for (var i=0; i < data.entries.length; i++) {
                    var info = data.entries[i];
                    var tab = $('<li><a>' + info.name + '</a></li>');
                    var link = tab.children('a');

                    link.attr('rel', info.action);
                    if (info.action == data.active) {
                        link.addClass('active');
                    }
                    container.append(tab);
                };
            }
        })
    );


    var SMIWorkspace = function(workspace, smi, options) {
        this._ = smi;
        this.workspace = workspace;
        this.options = options;
        var url = jsontemplate.Template(options.url, {});
        var loaded = false;

        // Disable text selection
        workspace.children('.info').disableTextSelect();

        // New workspace is loaded
        workspace.bind('content.smi', function (event, data) {
            var workspace = $(this);
            var info = workspace.children('.info');
            var content = workspace.children('.content');

            // Send an unload event
            if (loaded) {
                content.trigger('unload.smicontent');
            };
            // Update header
            info.children('h3').render(data.metadata.title);
            info.children('.tabs').render(data.metadata.tabs);
            info.children('#content-url').attr(
                'href', url.expand({path: data.metadata.path}));

            // Update content area
            content.render(data.content);

            loaded = true;
        });
    };

    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMIWorkspace = function(smi, options) {
        return new SMIWorkspace(this, smi, options);
    };

})(jQuery, obviel);

