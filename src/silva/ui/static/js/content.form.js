

(function($, obviel) {

    obviel.view({
        iface: 'form',
        name: 'content',
        render: function() {
            var form = this.content.children('form');
            var send = function(extra) {
                var values = form.serializeArray();

                if (extra) {
                    values = values.concat(extra);
                };
                this.smi.send(values);
            };

            // Bind default submit
            form.bind('submit', function() {
                var extra = [];

                if (this.data['default']) {
                    extra.push({name: this.data['default'], value:'Default'});
                };
                send(extra);
                return false;
            });

            // Bind click submit
            form.find('.controls input').bind('click', function() {
                var button = $(this);

                send([{
                    name: button.attr('name'),
                    value: button.attr('value')
                }]);
                return false;
            });

            // Send an event form loaded to init specific JS field
            form.trigger('load-smiform');

        },
        cleanup: function() {
            this.content.empty();
        }
    });

})(jQuery, obviel);
