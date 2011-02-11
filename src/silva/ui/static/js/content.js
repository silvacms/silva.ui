
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


    var SMIContent = function(content, smi, options) {
        this._ = smi;
        this.content = content;
        this.options = options;

        content.bind('smi.content', function (event, data) {
            $(this).children('.info').children('h3').render(data.info);
        });
    };

    /**
     * Folder navigation tree using JSTree plugin.
     */
    $.fn.SMIContent = function(smi, options) {
        return new SMIContent(this, smi, options);
    };

})(jQuery, obviel);

