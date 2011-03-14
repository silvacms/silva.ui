

(function($, obviel) {

    obviel.view({
        iface: 'form',
        name: 'content',
        bootstrap_form: function(form) {
            var form_prefix = form.attr('name');

            var focus_next_form =  function(event) {
                this.focus_next_form_field(form);
                event.preventDefault();
                return false;
            }.scope(this);
            var focus_prev_form = function(event) {
                this.focus_prev_form_field(form);
                event.preventDefault();
                return false;
            }.scope(this);

            // Create a shortcuts
            this.smi.shortcuts.create(form_prefix, form);
            this.smi.shortcuts.bind(form_prefix, 'ctrl+down', focus_next_form);
            this.smi.shortcuts.bind(form_prefix, 'ctrl+shift+down', focus_next_form);
            this.smi.shortcuts.bind(form_prefix, 'ctrl+up', focus_prev_form);
            this.smi.shortcuts.bind(form_prefix, 'ctrl+shift+up', focus_prev_form);

            // If the form is focused
            form.bind('focus-smi', function() {
                // Scroll into view and select the first field
                this.content.SMISmoothScroll('slow', 'absolute', form.position().top);
                this.focus_first_form_field(form);
            }.scope(this));

            var submit = function(extra) {
                var values = form.serializeArray();

                if (extra) {
                    values = values.concat(extra);
                };
                this.smi.send_to_screen(values);
            };
            var default_submit = function() {
                var extra = [];

                if (this.data['default']) {
                    extra.push({name: this.data['default'], value:'Default'});
                };
                submit(extra);
                return false;
            };

            // Bind default submit
            form.bind('submit', default_submit);
            this.smi.shortcuts.bind(form_prefix, 'enter', default_submit);

            // Bind click submit
            form.find('.form-controls a.form-control').bind('click', function() {
                var button = $(this);

                submit([{
                    name: button.attr('name'),
                    value: button.text()
                }]);
                return false;
            });

            // Set submit URL for helper
            form.attr('data-form-url', this.smi.get_screen_url());

            // Send an event form loaded to init specific JS field
            form.trigger('load-smiform', this.data);
        },
        focus_first_form_field: function(form) {
            var field = form.find('.field-error:first').find('.field:first');
            if (field.length) {
                // First error field
                this.focus_form_field(field);
            } else {
                // Focus first required field otherwise
                field = form.find('.field-required:first');
                this.focus_form_field(field);
            };
        },
        focus_next_form_field: function(form) {
            var focused = form.find('.form-focus');
            var field = focused.next();
            if (!field.length) {
                field = form.find('.form-section:first');
            };
            this.focus_form_field(field);
        },
        focus_prev_form_field: function(form) {
            var focused = form.find('.form-focus');
            var field = focused.prev();
            if (!field.length) {
                field = form.find('.form-section:last');
            };
            this.focus_form_field(field);
        },
        focus_form_field: function(field) {
            var section = field.closest('.form-section');

            if (section.is('.form-focus')) {
                return;
            };
            this.unfocus_form_fields();
            section.addClass('form-focus');
            section.find('.field:first').focus();
        },
        unfocus_form_fields: function() {
            this.forms.each(function() {
                $(this).find('.form-section').removeClass('form-focus');
            });
        },
        render: function() {
            var creator = this.bootstrap_form.scope(this);
            var focuser = this.focus_form_field.scope(this);

            // Add content
            this.content.addClass('form-content');
            if (this.data.portlets) {
                var content = $('<div class="forms"></div>');
                this.content.append(content);
                var portlets = $('<div class="portlets"></div>');
                portlets.html(this.data.portlets);
                this.content.append(portlets);
            } else {
                var content = this.content;
            };
            content.html(this.data.forms);

            // Find and bootstrap forms
            this.forms = content.find('form');
            this.forms.each(function () {
                creator($(this));
            });
            // Bind focus change events
            this.content.delegate('.form-section', 'focusin', function() {
                focuser($(this));
            });
            this.content.delegate('.form-section', 'click', function() {
                focuser($(this));
            });

            // Focus the first field of the first form.
            this.focus_first_form_field(this.forms.first());
        },
        cleanup: function() {
            this.forms.each(function (index, element) {
                this.smi.shortcuts.remove($(element).attr('name'));
            }.scope(this));
            this.content.removeClass('form-content');
            this.content.undelegate('.form-section', 'focusin');
            this.content.undelegate('.form-section', 'click');
            this.content.empty();
        }
    });

})(jQuery, obviel);
