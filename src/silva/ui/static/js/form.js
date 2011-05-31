

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
                var position = $field.position();
                var top = $base.scrollTop();
                var target = max(position.top - 25, 0);

                if (target < top) {
                    infrae.ui.scroll($base, 'slow', 'absolute', target);
                } else {
                    var size = $base.innerHeight();
                    var bottom = top + size;
                    target = position.top + $field.outerHeight() + 25;

                    if (target > bottom) {
                        infrae.ui.scroll($base, 'slow', 'absolute', target - size);
                    };
                };
            };

            /**
             * Focus the form field on which it is applied.
             */
            var focus_form_field = function($field) {
                var $section = $field.closest('.form-section');

                if ($section.is('.form-focus'))
                    return;
                unfocus_form_fields();
                $section.addClass('form-focus');
                $section.find('.field:first').focus();
            };
            var focus_first_form_field = function($base) {
                var $field = $base.find('.form-error:first').find('.field:first');

                if (!$field.length)
                    $field = $base.find('.field-required:first');
                if ($field.length) {
                    focus_form_field($field);
                    scroll_field_into_view($base, $field);
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

                    smi.shortcuts.create('form', $content, true);

                    // Initialize each form.
                    $forms.each(function() {
                        var $form = $(this);
                        var form_prefix = $form.attr('name');

                        var submit = function($control) {
                            var values = $form.serializeArray();

                            if ($control != undefined && $control.length) {
                                values.push({
                                    name: $control.attr('name'),
                                    value: $control.text()});
                            };
                            smi.ajax.send_to_opened(values);
                            return false;
                        };
                        var default_submit = function() {
                            return submit($form.find('.form-controls a.default-form-control'));
                        };

                        // Bind default submit and refresh
                        $form.bind('refresh-smi', submit);
                        $form.bind('submit', default_submit);

                        // Bind click submit
                        $form.find('.form-controls a.form-control').each(function () {
                            var $control = $(this);
                            var shortcut = $control.attr('data-form-shortcut');

                            $control.bind('click', function() {
                                return submit($control);
                            });
                            if (shortcut) {
                                smi.shortcuts.bind('form', [shortcut], function() {
                                    return submit($control);
                                });
                            };
                        });
                        $form.find('.form-controls a.form-button').each(function () {
                            var $control = $(this);
                            var shortcut = $control.attr('data-form-shortcut');

                            if (shortcut) {
                                smi.shortcuts.bind('form', [shortcut], function() {
                                    $control.click();
                                });
                            };
                        });

                        // Bind form focus
                        $form.delegate('.form-section', 'click', function () {
                            focus_form_field($(this));
                        });

                        // Set submit URL for helper
                        $form.attr('data-form-url', smi.get_screen_url());

                        // Send an event form loaded to init specific JS field
                        $form.trigger('load-smiform', data);
                    });

                    // Focus the first field of the first form.
                    focus_first_form_field($content);

                    // Shortcuts field navigation
                    smi.shortcuts.bind('form', ['ctrl+down', 'ctrl+shift+down'], function() {
                        focus_next_form_field($content);
                        return false;
                    });
                    smi.shortcuts.bind('form', ['ctrl+up', 'ctrl+shift+up'], function() {
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
