

(function($) {

    obviel.iface('form');
    obviel.view(
        new obviel.View({
            iface: 'form',
            render: function(element, data) {
                var content = $(element);

                content.one('unload.smicontent', function(event) {
                    content.empty();
                    content.removeClass('content-area');
                });

                content.html(data.form);
                content.addClass('content-area');
            }
        })
    );

})(jQuery, obviel);
