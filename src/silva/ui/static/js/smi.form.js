

(function($, infrae) {

    /**
     * Scroll the whole field (i.e. its title, description and all
     * input widgets) into the $content area.
     */
    var scroll_field_into_view = function($content, $field) {
        var $section = $field.closest('.form-section');

        if (!$section.length) {
            return;
        };

        var section_top = $section.position().top,
            section_height = $section.outerHeight(),
            section_bottom = section_top + section_height,
            content_top = $content.scrollTop(),
            content_height = $content.innerHeight(),
            content_bottom = content_top + content_height;

        if ((section_top - 25) < content_top) {
            infrae.ui.scroll($content, 'fast', 'absolute', section_top - 25);
        } else if (content_bottom < (section_bottom + 25)) {
            infrae.ui.scroll($content, 'fast', 'absolute', section_bottom - content_height + 25);
        };
    };

    /**
     * Unfocus every form fields in the given $content area.
     */
    var unfocus_form_fields = function($content) {
        $content.find('.form-section').removeClass('form-focus');
    };

    /**
     * Focus the given form $field in the given $content
     * area. Optionally send a focus event to the form widget
     * contained in this field.
     */
    var focus_form_field = function($content, $field, no_input_focus) {
        var $section = $field.closest('.form-section');

        if ($section.is('.form-focus')) {
            return;
        };
        unfocus_form_fields($content);
        $section.addClass('form-focus');
        if (!no_input_focus) {
            $section.find('.field:first').focus();
        };
    };

    /**
     * Focus the first required field or the first field with an error
     * in the given $content area. It will scroll in place for the
     * field.
     *
     * This is called when the form is initialized.
     */
    var focus_first_form_field = function($content) {
        var $field = $content.find('.form-error:first').find('.field:first');

        if (!$field.length){
            $field = $content.find('.field-required:first');
            if (!$field.length) {
                $field = $content.find('.field:first');
            }
        };
        if ($field.length) {
            focus_form_field($content, $field);
            scroll_field_into_view($content, $field);
        };
    };

    /**
     * Inside the given $content area find and focus the next field
     *  located after the currently focused one.
     *
     * This is called by the keyboard shortcuts handler (ctrl+down).
     */
    var focus_next_form_field = function($content) {
        var $focused = $content.find('.form-focus'),
            $field = $focused.next(),
            $next_body, $next_form;

        if (!$field.length) {
            // We didn't find a field in this form, try the next form.
            $next_body = $focused.closest('.form-body').nextAll('.form-body');

            if ($next_body.length)
                $field = $next_body.find('.form-section:first');
            else {
                $next_form = $focused.closest('form').nextAll('form');

                if ($next_form.length)
                    $field = $next_form.find('.form-section:first');
                else
                    $field = $content.find('.form-section:first');
            };
        };
        focus_form_field($content, $field);
        scroll_field_into_view($content, $field);
    };

    /**
     * Inside the given $content area find and focus the previous
     * field located before the currently focused one.
     *
     * This is called by the keyboard shortcuts handler (ctrl+up).
     */
    var focus_previous_form_field = function($content) {
        var $focused = $content.find('.form-focus'),
            $field = $focused.prev(),
            $prev_body, $prev_form;

        if (!$field.length) {
            $prev_body = $focused.closest('.form-body').prevAll('.form-body');

            if ($prev_body.length)
                $field = $prev_body.find('.form-section:last');
            else {
                $prev_form = $focused.closest('form').prevAll('form');

                if ($prev_form.length)
                    $field = $prev_form.find('.form-section:last');
                else
                    $field = $content.find('.form-section:last');
            };
        };
        focus_form_field($content, $field);
        scroll_field_into_view($content, $field);
    };

    // Bind form helpers: focus changes, cleanup error, load widgets JS
    $(document).on('load-smiform', '.form-content', function(event, data) {
        var $container = data.container || $(this),
            $content = data.$content || $container,
            $form = data.form || $container.find('form');

        // Bind form focus
        var focus_form_event = function (event) {
            var $target = $(event.target),
                $section = $target.closest('.form-section'),
                is_cancelable = $target.is('input') || $target.is('a');

            focus_form_field($content, $section, is_cancelable);
            if (!is_cancelable) {
                event.stopPropagation();
            };
        };

        $container.delegate('.form-section', 'click', focus_form_event);
        $container.delegate('.form-section', 'focusin', focus_form_event);

        // Remove errors if you click on it
        $container.delegate('.form-error-detail', 'click', function () {
            $(this).fadeOut().promise().done(function() { $(this).remove() });
        });

        // Focus the first field of the first form.
        focus_first_form_field($content);
        // Load the widgets.
        $form.trigger('loadwidget-smiform', data);
    });

    infrae.views.view({
        iface: 'form',
        name: 'content',
        factory: function($content, data, smi) {
            var $container = null,
                $form = $([]);

            return {
                template_data: true,
                render: function() {
                    // Add content
                    if (data.portlets) {
                        var $portlets = $('<div class="portlets form-content"></div>');

                        $container = $('<div class="forms form-content"></div>');
                        $portlets.html(data.portlets);
                        $content.append($container);
                        $content.append($portlets);
                    } else {
                        $container = $content;
                        $container.addClass('form-content');
                    };
                    // Find forms.
                    $container.html(data.forms);
                    $form = $container.find('form');

                    smi.shortcuts.create('form', $container, true);

                    // Initialize each form.
                    $form.each(function() {
                        var $form = $(this);
                        var form_prefix = $form.attr('name');

                        var make_submit = function($control) {
                            var message = $control.attr('data-confirmation');

                            if (message !== undefined) {
                                var title = $control.attr('data-confirmation-title');

                                // If there is a message, ask confirmation before triggering the action
                                if (!title) {
                                    title = 'Please confirm';
                                };
                                return function () {
                                    infrae.ui.ConfirmationDialog({title:title, message:message}).then(function() {
                                        return submit($control);
                                    });
                                    return false;
                                };
                            };
                            // Trigger directly the action.
                            return function () {
                                return submit($control);
                            };
                        };

                        var submit = function($control) {
                            $form.trigger('serialize-smiform', {form: $form, container: $container});

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
                            } else {
                                smi.ajax.send_to_opened(values);
                                return false;
                            };
                        };

                        // Bind default submit and refresh
                        $form.bind('submit', make_submit($form.find('.form-controls a.default-form-control')));

                        // Bind click submit
                        $form.find('.form-controls a.form-control').each(function () {
                            var $control = $(this),
                                shortcut = $control.attr('data-form-shortcut'),
                                handler = make_submit($control);

                            $control.bind('click', handler);
                            if (shortcut) {
                                smi.shortcuts.bind('form', null, [shortcut], handler);
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
                        $form.delegate('.form-controls a.form-popup', 'click', function () {
                            var $control = $(this);

                            $control.SMIFormPopup().done(function (data) {
                                if (data.extra && data.extra.refresh == form_prefix) {
                                    submit();
                                };
                            });
                            return false;
                        });

                        // Tip
                        $form.tipsy({delegate: 'a.form-control'});
                        $form.tipsy({delegate: 'a.form-button'});

                        // Set submit URL for helper
                        $form.attr('data-form-url', smi.get_screen_url());

                    });
                    // Send an event form loaded to init specific JS field
                    $container.trigger('load-smiform', {form: $form, container: $container, $content: $content});

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
                    // Send cleanup event
                    if ($container !== null) {
                        $container.trigger('clean-smiform', {form: $form, container: $container});
                    };
                    // Cleanup
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
