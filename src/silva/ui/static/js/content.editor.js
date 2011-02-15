

(function($) {

    obviel.iface('editor');
    obviel.view(
        new obviel.View({
            iface: 'editor',
            render: function(element, data) {
                $(element).SMIContentEditor(data);
            }
        })
    );

    var SMIEditor = function(content, data, settings) {
        var textarea = $('<textarea></textarea>');
        var editor = null;

        content.one('unload.smicontent', function(event) {
            content.empty();
            content.removeClass('content-area');
            if (editor) {
                editor.destroy(true);
            }
        });

        textarea.attr('name', data.name);
        textarea.html(data.text);

        content.addClass('content-area');
        content.append(textarea);

        editor = CKEDITOR.replace(textarea.get(0), settings);
        editor.on('instanceReady', function (event) {
            // XXX Where the hell comes from those 7 pixels ?
            var height = content.height() - 7;

            height -= $('#cke_top_body').outerHeight();
            height -= $('#cke_bottom_body').outerHeight();
            editor.resize(editor.container.getStyle('width'), height, true);
        });
    };

    $(document).bind('load.smiplugins', function(event, smi) {
        $.ajax({
            url: smi.options.editor.configuration,
            async: false,
            dataType: 'json',
            success:function(configuration) {

                for (var name in configuration['paths']) {
                    CKEDITOR.plugins.addExternal(name, configuration['paths'][name]);
                };
                var settings = {
                    entities: false,
                    fullPage: false,
                    language: smi.get_language(),
                    contentsCss: configuration['contents_css'],
                    silvaFormats: configuration['formats'],
                    extraPlugins: configuration['plugins'],
                    removePlugins: 'save,link,flash,image,filebrowser,iframe,forms',
                    skin: configuration['skin'],
                    toolbar: 'Silva',
                    height: '2000px',
                    toolbar_Silva: configuration['toolbars'],
                    resize_enabled: false
                };

                $.fn.SMIContentEditor = function(data) {
                    return new SMIEditor($(this), data, settings);
                };
            }});
    });

})(jQuery, obviel, CKEDITOR);
