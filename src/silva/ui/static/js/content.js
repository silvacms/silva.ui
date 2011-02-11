
(function($) {

    obviel.iface('title');
    obviel.view(
        new obviel.View({
            iface: 'title',
            render: function(element, data) {
                var title = $(element);
                var icon = $('<ins class="icon"></ins');

                icon.addClass(data['icon']);
                title.text(data['title']);
                title.prepend(icon);
            }
        })
    );
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


    var SMIContent = function(content, smi, options) {
        this._ = smi;
        this.content = content;
        this.options = options;

        // Disable text selection
        content.children('.info').disableTextSelect();

        // New content is loaded
        content.bind('smi.content', function (event, data) {
            $(this).children('.info').children('h3').render(data.metadata.title);
            $(this).children('.info').children('.tabs').render(data.metadata.tabs);

        });
    };

    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMIContent = function(smi, options) {
        return new SMIContent(this, smi, options);
    };

})(jQuery, obviel);

