

(function($) {

    obviel.iface('editor');

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

                obviel.view({
                    iface: 'editor',
                    name: 'content',
                    init: function() {
                        this.editor = null;
                    },
                    render: function() {
                        var textarea = $('<textarea></textarea>');

                        textarea.attr('name', this.data.name);
                        textarea.html(this.data.text);

                        this.content.addClass('content-area');
                        this.content.append(textarea);

                        this.editor = CKEDITOR.replace(textarea.get(0), settings);
                        this.editor.on('instanceReady', function (event) {
                            // XXX Where the hell comes from those 7 pixels ?
                            var height = this.content.height() - 7;

                            height -= $('#cke_top_body').outerHeight();
                            height -= $('#cke_bottom_body').outerHeight();
                            this.editor.resize(
                                this.editor.container.getStyle('width'),
                                height,
                                true);
                        }.scope(this));
                    },
                    cleanup: function() {
                        this.content.empty();
                        this.content.removeClass('content-area');
                        if (this.editor) {
                            this.editor.destroy(true);
                        }
                    }
                });
            }
        });
    });
})(jQuery, obviel, CKEDITOR);
