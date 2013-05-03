

(function($, infrae, jsontemplate) {

    /** Support for inline preview inside a listing (folder listing or reference listing inside a reference widget).
     */
    $(document).bind('load-smilisting', function(event, data) {
        var smi = data.smi;

        if (smi.options.listing.preview === undefined) {
            return;
        };

        var url_template = new jsontemplate.Template(smi.options.listing.preview, {}),
            preview_template = new jsontemplate.Template('{.section title}<h2>{title|html}</h2>{.end}{.section preview}<div class="preview">{preview}</div>{.end}<div class="type"><span>{type}</span></div>', {});
        var timer = null,
            $target = $([]);

        var clear_preview = function () {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            };
            if ($target.length) {
                $target.tipsy('hide');
                $target = $([]);
            };
        };

        $(document).on('mouseenter', '.listing tr.item a.preview-icon', function(event) {
            clear_preview();
            $target = $(event.target);
            timer = setTimeout(function () {
                var info = $target.closest('tr.item').data('smilisting');
                if (info === undefined) {
                    return;
                };
                $.ajax({
                    url: url_template.expand({path: info.path})
                }).done(function(data) {
                    if (!$target.is(':visible')) {
                        return;
                    };
                    $target.tipsy({
                        trigger: 'manual',
                        html: true,
                        delayIn: 0,
                        title: function() {
                            return preview_template.expand(data);
                        },
                        gravity: 'w'
                    });
                    $target.tipsy('show');
                });
            }, 1000);
        });
        $(document).on('mouseleave', '.listing tr.item a.preview-icon', clear_preview);
    });

})(jQuery, infrae, jsontemplate);
