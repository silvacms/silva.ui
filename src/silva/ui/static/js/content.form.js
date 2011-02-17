

(function($) {

    obviel.iface('form');
    obviel.view({
        iface: 'form',
        name: 'content',
        render: function(element, data) {
            $(element).SMIForm(data);
        }
    });

    var SMIForm = function(content, data, smi) {

        content.one('unload.smicontent', function() {
            content.empty();
            content.removeClass('content-area');
        });

        content.html(data.form);
        content.addClass('content-area');

        var form = content.children('form');

        var send = function(extra) {
            var data = form.serializeArray();

            if (extra) {
                data = data.concat(extra);
            };
            smi.send(data);
        };

        form.bind('submit', function() {
            var extra = [];

            if (data['default']) {
                extra.push({name: data['default'], value:'Default'});
            };
            send(extra);
            return false;
        });

        form.find('.controls input').bind('click', function() {
            var button = $(this);

            send([{
                name: button.attr('name'),
                value: button.attr('value')
            }]);
            return false;
        });
    };

    $(document).bind('load.smiplugins', function(event, smi) {
        $.fn.SMIForm = function(data) {
            return new SMIForm($(this), data, smi);
        };
    });

})(jQuery, obviel);
