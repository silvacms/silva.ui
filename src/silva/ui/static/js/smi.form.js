

(function($, infrae) {

    // This is not really usefull, we could take this as a parameter.
    $.fn.invoke = function() {
        return Array.prototype.splice.call(arguments, 0, 1)[0].apply(this, arguments);
    };

    // Scroll field into view.
    var scroll_field_into_view = function($field) {
        if (!$field.length) {
            return;
        };

        var top = $field.position().top;
        var height = $field.outerHeight();
        var $container = $(this);
        var target, limit;

        if (top < 25) {
            target = $container.scrollTop() - 25 + top;
            infrae.ui.scroll($container, 'fast', 'absolute', target);
        } else {
            limit = $container.innerHeight() - height - 25;
            if (top > limit) {
                target = $container.scrollTop() + (top - limit);
                infrae.ui.scroll($container, 'fast', 'absolute', target);
            };
        };
    };

    // Unfocus all field.
    var unfocus_form_fields = function() {
        $(this).find('.form-section').removeClass('form-focus');
    };

    // Focus form field.
    var focus_form_field = function($field, no_input_focus) {
        var $section = $field.closest('.form-section');

        if ($section.is('.form-focus')) {
            return;
        };
        $(this).invoke(unfocus_form_fields);
        $section.addClass('form-focus');
        if (!no_input_focus) {
            $section.find('.field:first').focus();
        };
    };
    var focus_first_form_field = function() {
        var $forms = $(this);
        var $field = $forms.find('.form-error:first').find('.field:first');

        if (!$field.length){
            $field = $forms.find('.field-required:first');
            if (!$field.length)
                $field = $forms.find('.field:first');
        };
        if ($field.length) {
            $forms.invoke(focus_form_field, $field);
            $forms.invoke(scroll_field_into_view, $field.closest('.form-section'));
        };
    };
    var focus_next_form_field = function() {
        var $forms = $(this);
        var $focused = $forms.find('.form-focus');
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
                    $field = $forms.find('.form-section:first');
            };
        };
        $forms.invoke(focus_form_field, $field);
        $forms.invoke(scroll_field_into_view, $field);
    };
    var focus_previous_form_field = function() {
        var $forms = $(this);
        var $focused = $forms.find('.form-focus');
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
                    $field = $forms.find('.form-section:last');
            };
        };
        $forms.invoke(focus_form_field, $field);
        $forms.invoke(scroll_field_into_view, $field);
    };

    // Bind form helpers: focus changes, cleanup error, load widgets JS
    $('.form-content').live('load-smiform', function(event, data) {
        var $container = data.container || $(this);
        var $form = data.form || $container.find('form');

        // Bind form focus
        var focus_form_event = function (event) {
            var $target = $(event.target);
            var $section = $target.closest('.form-section');
            var is_cancelable = $target.is('input') || $target.is('a');

            $container.invoke(focus_form_field, $section, is_cancelable);
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
        $container.invoke(focus_first_form_field);
        // Load the widgets.
        $form.trigger('loadwidget-smiform', data);
    });

    infrae.views.view({
        iface: 'form',
        name: 'content',
        factory: function($content, data, smi) {
            var $content_form = null;
            var $forms = $([]);

            return {
                template_data: true,
                render: function() {
                    // Add content
                    if (data.portlets) {
                        var $content_portlets = $('<div class="portlets form-content"></div>');

                        $content_form = $('<div class="forms form-content"></div>');
                        $content_portlets.html(data.portlets);
                        $content.append($content_form);
                        $content.append($content_portlets);
                    } else {
                        $content_form = $content;
                        $content_form.addClass('form-content');
                    };
                    // Find forms.
                    $content_form.html(data.forms);
                    $forms = $content_form.find('form');

                    smi.shortcuts.create('form', $content_form, true);

                    // Initialize each form.
                    $forms.each(function() {
                        var $form = $(this);
                        var form_prefix = $form.attr('name');

                        var submit = function($control) {
                            $form.trigger('serialize-smiform', {form: $form, container: $content_form});

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
                    $content_form.trigger('load-smiform', {form: $forms, container: $content_form});

                    // Shortcuts field navigation
                    smi.shortcuts.bind('form', null, ['ctrl+down', 'ctrl+shift+down'], function() {
                        $content_form.invoke(focus_next_form_field);
                        return false;
                    });
                    smi.shortcuts.bind('form', null, ['ctrl+up', 'ctrl+shift+up'], function() {
                        $content_form.invoke(focus_previous_form_field);
                        return false;
                    });
                },
                cleanup: function() {
                    // Send cleanup event
                    if ($content_form !== null) {
                        $content_form.trigger('clean-smiform', {form: $forms, container: $content_form});
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
