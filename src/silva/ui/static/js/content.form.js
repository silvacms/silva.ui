

(function($, obviel) {

    obviel.view({
        iface: 'form',
        name: 'content',
        render: function() {
            var form = this.content.find('form');
            var send = function(extra) {
                var values = form.serializeArray();

                if (extra) {
                    values = values.concat(extra);
                };
                this.smi.send_to_screen(values);
            };
            // Set submit URL for helper
            form.attr('data-form-url', this.smi.get_screen_url());

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
            form.find('.form-controls a.form-control').bind('click', function() {
                var button = $(this);

                send([{
                    name: button.attr('name'),
                    value: button.text()
                }]);
                return false;
            });

            // Send an event form loaded to init specific JS field
            form.trigger('load-smiform', this.data);

        },
        cleanup: function() {
            this.content.empty();
        }
    });

})(jQuery, obviel);
