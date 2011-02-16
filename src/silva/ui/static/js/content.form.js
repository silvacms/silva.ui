

(function($) {

    obviel.iface('form');
    obviel.view(
        new obviel.View({
            iface: 'form',
            render: function(element, data) {
                $(element).html('hello');
            }
        })
    );

})(jQuery, obviel);
