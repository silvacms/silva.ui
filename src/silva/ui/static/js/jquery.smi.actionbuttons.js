(function($) {
  var methods = {
    init: function(options){
      return $(this).each(function() {
        $(this).data('actions', options.actions);
        $(this).data('source', options.source);
        $(this).trigger('actionbuttons.init.first', $(this).data());
        $(this).ActionButtons('build');
        $(this).trigger('actionbuttons.init.done', $(this).data());
      });
    },
    build: function() {
      $(this).empty();
      if ($(this).data('actions')) {
        var $self = $(this);
        $.each($(this).data('actions'), function(name, data) {
          $self.append('<a rel="' + name + '">' + data.caption + '</a>');
          $self.find('a[rel=' + name + ']').ActionButton({ name: name, data: data, parent: $self });
        });
      }
      $(this).ActionButtons('update');
      $(this).trigger('actionbuttons.build.done', $(this).data());
    },
    getstate: function() {
      return $($(this).data('source')).find('tbody').findState('tr', '.selected');
    },
    getitems: function() {
      return $($(this).data('source')).find('.selected');
    }
  };

  $.fn.ActionButtons = function(method) {
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };

  var actions = {
    init: function(options) {
      var $this = $(this);
      $this.data('enabled', false);
      $this.data('parent', options.parent);
      $this.data('trigger', options.data.trigger);
      $this.data('triggers', options.data.triggers);
      $this.data('handler', options.data.handler);
      $this.data('keybind', options.data.keybind);
      $this.data('hide', options.data.hide);
      if (options.data.css) {
        $this.css(options.data.css);
      }
      if (options.data.desc) {
        $this.attr('title', options.data.desc);
      }
      $this.ActionButton('update');

      $('body').live('actionbuttons.click', function() {
        $this.ActionButton('update');
      });
      $('body').live('smarttable.row.click', function() {
        $this.ActionButton('update');
      });
      $this.live('click', function() {
        if ($this.data('enabled')) {
          options.data.handler(
            options.parent.data('source'),
            options.parent.ActionButtons('getitems')
          );
          $this.trigger('actionbuttons.click', $this.data());
        }
      });
      if (options.data.keybind) {
        $('body').SMI('keybind', options.data.keybind, function() {
          if ($this.data('enabled')) {
            options.data.handler(
              options.parent.data('source'),
              options.parent.ActionButtons('getitems')
            );
            $this.trigger('actionbuttons.click', $this.data());
          }
        });
      }
    },
    update: function() {
      var enabled = false;
      if ($.isFunction($(this).data('trigger'))) {
        enabled = ($(this).data('trigger')($(this).data('source'), $(this).data('parent').ActionButtons('getitems')));
      } else if ($(this).data('triggers')) {
        var state = $(this).data('parent').ActionButtons('getstate');
        enabled = ($(this).array_match(state.split(' '), $(this).data('triggers')) != false);
      } else {
        enabled = true;
      }
      $(this).ActionButton('toggle', enabled);
    },
    toggle: function(enabled) {
      $(this).data('enabled', enabled);
      if (enabled) {
        $(this).removeClass('disabled hidden');
      } else {
        $(this).addClass('disabled');
        if ($(this).data('hide')) {
          $(this).addClass('hidden');
        }
      }
    }
  };

  $.fn.ActionButton = function(action) {
    if(actions[action]) {
      return actions[action].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof action === 'object' || !actions) {
      return actions.init.apply(this, arguments);
    }
  };
})(jQuery);