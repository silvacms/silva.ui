

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

            var max = function (n1, n2) {
                return n1 > n2 ? n1 : n2;
            };

            /**
             * Scroll the field into view if it is not.
             */
            var scroll_field_into_view = function($base, $field) {
                if (!$field.length) {
                    return;
                };

                var top = $field.position().top;
                var height = $field.outerHeight();
                var target, limit;

                if (top < 25) {
                    target = $base.scrollTop() - 25 + top;
                    infrae.ui.scroll($base, 'fast', 'absolute', target);
                } else {
                    limit = $base.innerHeight() - height - 25;
                    if (top > limit) {
                        target = $base.scrollTop() + (top - limit);
                        infrae.ui.scroll($base, 'fast', 'absolute', target);
                    };
                };
            };

            /**
             * Focus the form field on which it is applied.
             */
            var focus_form_field = function($field, no_input_focus) {
                var $section = $field.closest('.form-section');

                if ($section.is('.form-focus')) {
                    return;
                };
                unfocus_form_fields();
                $section.addClass('form-focus');
                if (!no_input_focus) {
                    $section.find('.field:first').focus();
                };
            };
            var focus_first_form_field = function($base) {
                var $field = $base.find('.form-error:first').find('.field:first');

                if (!$field.length){
                    $field = $base.find('.field-required:first');
                    if (!$field.length)
                        $field = $base.find('.field:first');
                };
                if ($field.length) {
                    focus_form_field($field);
                    scroll_field_into_view($base, $field.closest('.form-section'));
                };
            };
            var focus_next_form_field = function($base) {
                var $focused = $base.find('.form-focus');
                var $field = $focused.next();

                if (!$field.length) {
                    var $next_body = $focused.closest('.form-body').nextAll('.form-body');
                    if ($next_body.length)
                        $field = $next_body.find('.form-section:first');
                    else {
                        var $next_form = $focused.closest('form').nextAll('form');
                        if ($next_form.length)
                            $field = $next_form.find('.form-section:first');
                        else
                            $field = $base.find('.form-section:first');
                    };
                };
                focus_form_field($field);
                scroll_field_into_view($base, $field);
            };
            var focus_previous_form_field = function($base) {
                var $focused = $base.find('.form-focus');
                var $field = $focused.prev();

                if (!$field.length) {
                    var $prev_body = $focused.closest('.form-body').prevAll('.form-body');
                    if ($prev_body.length)
                        $field = $prev_body.find('.form-section:last');
                    else {
                        var $prev_form = $focused.closest('form').prevAll('form');
                        if ($prev_form.length)
                            $field = $prev_form.find('.form-section:last');
                        else
                            $field = $base.find('.form-section:last');
                    };
                };
                focus_form_field($field);
                scroll_field_into_view($base, $field);
            };

            return {
                data_template: true,
                render: function() {
                    var $content_form = null;

                    // Add content
                    $content.addClass('form-content');
                    if (data.portlets) {
                        var $content_portlets = $('<div class="portlets"></div>');

                        $content_form = $('<div class="forms"></div>');
                        $content_portlets.html(data.portlets);
                        $content.append($content_form);
                        $content.append($content_portlets);
                    } else {
                        $content_form = $content;
                    };
                    $content_form.html(data.forms);

                    // Find all forms.
                    $forms = $content_form.find('form');

                    smi.shortcuts.create('form', $content, true);

                    // Initialize each form.
                    $forms.each(function() {
                        var $form = $(this);
                        var form_prefix = $form.attr('name');

                        var submit = function($control) {
                            var values = $form.serializeArray();
                            var is_link = false;

                            if ($control !== undefined && $control.length) {
                                values.push({
                                    name: $control.attr('name'),
                                    value: $control.text()
                                });
                                is_link = $control.hasClass('link-control');
                            };
                            if (is_link) {
                                // If action is a link control, it will open in a different target.
                                $control.attr(
                                    'href',
                                    [smi.get_screen_url(), '?', $.param(values)].join(''));
                                return;
                            } else {
                                smi.ajax.send_to_opened(values);
                                return false;
                            }
                        };
                        var default_submit = function() {
                            return submit($form.find('.form-controls a.default-form-control'));
                        };

                        // Bind default submit and refresh
                        $form.bind('submit', default_submit);

                        // Bind click submit
                        $form.find('.form-controls a.form-control').each(function () {
                            var $control = $(this);
                            var shortcut = $control.attr('data-form-shortcut');

                            $control.bind('click', function() {
                                return submit($control);
                            });
                            if (shortcut) {
                                smi.shortcuts.bind('form', null, [shortcut], function() {
                                    return submit($control);
                                });
                            };
                        });
                        $form.find('.form-controls a.form-button').each(function () {
                            var $control = $(this);
                            var shortcut = $control.attr('data-form-shortcut');

                            if (shortcut) {
                                smi.shortcuts.bind('form', null, [shortcut], function() {
                                    $control.click();
                                    return false;
                                });
                            };
                        });
                        $form.find('.form-controls a.form-popup').each(function () {
                            var $control = $(this);

                            $control.bind('click', function() {
                                $control.SMIFormPopup().done(function (data) {
                                    if (data.extra && data.extra.refresh == form_prefix) {
                                        submit();
                                    };
                                });
                                return false;
                            });
                        });

                        // Bind form focus
                        $form.delegate('.form-section', 'click', function (event) {
                            focus_form_field($(this), $(event.target).is('input'));
                        });

                        // Set submit URL for helper
                        $form.attr('data-form-url', smi.get_screen_url());

                        // Send an event form loaded to init specific JS field
                        $form.trigger('load-smiform', data);
                    });

                    // Remove errors if you click on it
                    $content_form.delegate('.form-error-detail', 'click', function () {
                        $(this).fadeOut().promise().done(function() {$(this).remove()});
                    });

                    // Focus the first field of the first form.
                    focus_first_form_field($content);

                    // Shortcuts field navigation
                    smi.shortcuts.bind('form', null, ['ctrl+down', 'ctrl+shift+down'], function() {
                        focus_next_form_field($content);
                        return false;
                    });
                    smi.shortcuts.bind('form', null, ['ctrl+up', 'ctrl+shift+up'], function() {
                        focus_previous_form_field($content);
                        return false;
                    });
                },
                cleanup: function() {
                    smi.shortcuts.remove('form');
                    $content.undelegate('.form-section', 'focusin');
                    $content.undelegate('.form-section', 'click');
                    $content.removeClass('form-content');
                    $content.empty();
                }
            };
        }
    });

})(jQuery, infrae);
