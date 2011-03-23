

(function($, obviel, CKEDITOR) {

    obviel.iface('editor');

    $(document).bind('load-smiplugins', function(event, smi) {
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
                    toolbar: 'Silva',
                    height: '2000px',
                    toolbar_Silva: configuration['toolbars'],
                    resize_enabled: false
                };
                if (configuration['skin']) {
                    settings['skin'] = configuration['skin'];
                };

                obviel.view({
                    iface: 'editor',
                    name: 'content',
                    jsont: '<textarea name="{data.name|htmltag}">{data.text}</textarea>',
                    init: function() {
                        this.editor = null;
                    },
                    render: function() {
                        var textarea = this.$content.children('textarea').get(0);

                        this.editor = CKEDITOR.replace(textarea, settings);
                        this.editor.on('instanceReady', function (event) {
                            // XXX Where the hell comes from those 5 pixels ?
                            var height = this.$content.height() - 5;

                            height -= $('#cke_top_body').outerHeight();
                            height -= $('#cke_bottom_body').outerHeight();
                            this.editor.resize(
                                this.editor.container.getStyle('width'),
                                height,
                                true);
                        }.scope(this));
                    },
                    cleanup: function() {
                        this.$content.empty();
                        if (this.editor) {
                            try {
                                this.editor.destroy(true);
                                this.editor = null;
                            } catch(error) {
                                if (window.console && console.log) {
                                    console.log('Error while destroying editor', error);
                                };
                            };
                        }
                    }
                });
            }
        });
    });
})(jQuery, obviel, CKEDITOR);
