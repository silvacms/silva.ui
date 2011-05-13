

(function($, infrae) {

    infrae.views.view({
        iface: 'form',
        name: 'content',
        factory: function($content, data, smi) {
            // Store a jQuery object with all form objects.
            var $forms = $([]);

            /**
             * Unfocus ALL form fields.
             */
            var unfocus_form_fields = function() {
                $forms.each(function() {
                    $(this).find('.form-section').removeClass('form-focus');
                });
            };

            /**
             * Focus the form field on which it is applied.
             */
            var focus_form_field = function() {
                var $section = $(this).closest('.form-section');

                if ($section.is('.form-focus')) {
                    return;
                };
                unfocus_form_fields();
                $section.addClass('form-focus');
                $section.find('.field:first').focus();
            };

            var focus_first_form_field = function($form) {
                var $field = $form.find('.field-error:first').find('.field:first');
                if ($field.length) {
                    // First error field
                    focus_form_field.apply($field);
                } else {
                    // Focus first required field otherwise
                    $field = $form.find('.field-required:first');
                    focus_form_field.apply($field);
                };
            };
                // focus_next_form_field: function($form) {
                //     var $focused = $form.find('.form-focus');
                //     var $field = $focused.next();
                //     if (!$field.length) {
                //         $field = $form.find('.form-section:first');
                //     };
                //     this.focus_form_field($field);
                // },
                // focus_prev_form_field: function($form) {
                //     var $focused = $form.find('.form-focus');
                //     var $field = $focused.prev();
                //     if (!$field.length) {
                //         $field = $form.find('.form-section:last');
                //     };
                //     this.focus_form_field($field);
                // },

            return {
                data_template: true,
                render: function() {
                    // Add content
                    $content.addClass('form-content');
                    if (data.portlets) {
                        var $content_form = $('<div class="forms"></div>');
                        var $content_portlets = $('<div class="portlets"></div>');

                        $content_portlets.html(data.portlets);
                        $content.append($content_form);
                        $content.append($content_portlets);
                    } else {
                        var $content_form = $content;
                    };
                    $content_form.html(data.forms);

                    // Find all forms.
                    $forms = $content_form.find('form');

                    // Initialize each form.
                    $forms.each(function() {
                        var $form = $(this);
                        var form_prefix = $form.attr('name');

                        var submit = function(extra) {
                            var values = $form.serializeArray();

                            if (extra) {
                                values = values.concat(extra);
                            };
                            smi.send_to_screen(values);
                            return false;
                        };
                        var default_submit = function() {
                            var extra = [];

                            if (data['default']) {
                                extra.push({name: data['default'], value:'Default'});
                            };
                            return submit(extra);
                        };

                        // Bind default submit and refresh
                        $form.bind('refresh-smi', submit);
                        $form.bind('submit', default_submit);

                        // Bind click submit
                        $form.find('.form-controls a.form-control').bind('click', function() {
                            var button = $(this);

                            submit([{
                                name: button.attr('name'),
                                value: button.text()
                            }]);
                            return false;
                        });

                        // Bind form focus
                        $form.delegate('.form-section', 'focusin', focus_form_field);
                        $form.delegate('.form-section', 'click', focus_form_field);

                        // If the form is focused
                        // $form.bind('focus-smi', function() {
                        //     // Scroll into view and select the first field
                        //     this.$content.SMISmoothScroll('slow', 'absolute', $form.position().top);
                        //     this.focus_first_form_field($form);
                        // }.scope(this));

                        // Set submit URL for helper
                        $form.attr('data-form-url', smi.get_screen_url());

                        // Send an event form loaded to init specific JS field
                        $form.trigger('load-smiform', data);
                    });

                    // Focus the first field of the first form.
                    focus_first_form_field($forms.first());
                },
                cleanup: function() {
                    $content.undelegate('.form-section', 'focusin');
                    $content.undelegate('.form-section', 'click');
                    $content.removeClass('form-content');
                    $content.empty();
                }
            };
        }
    });

})(jQuery, infrae);
