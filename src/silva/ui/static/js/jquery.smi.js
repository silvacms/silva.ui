(function($) {
  /**
   * Main SMI loader
   */
  $.fn.SMI = function(method) {
    var $SMI = this;
    $SMI.find('#header').disableTextSelect();
    
    var methods = {
      init: function(options) {
        // Check required options
        if (!options.tree || !options.main || !options.tree.container || !options.main.container) {
          alert('Missing required initialisation parameters.');
        }

        // Load SMITree
        if (typeof options.tree.container == 'object') {
          $(options.tree.container).SMITree(options.tree.data);
        } else {
          $SMI.find(options.tree.container).SMITree(options.tree.data);
        }
        
        // Load SMIMain
        if (typeof options.main.container == 'object') {
          $(options.main.container).SMIMain('init', options.main.data);
        } else {
          $SMI.find(options.main.container).SMIMain('init', options.main.data);
        }

        $('#contents').addClass('focus');
        $('body').keydown(function(e) {
          if (e.ctrlKey && e.shiftKey) {
            $('#tree, #contents').addClass('highlight');
            if (e.keyCode == 37) {
              $('#contents').removeClass('focus');
              $('body').trigger('smi.contents.blur');
              $('body').trigger('smi.tree.focus');
              $('#tree').addClass('focus');
            } else if (e.keyCode == 39) {
              $('#tree').removeClass('focus');
              $('body').trigger('smi.tree.blur');
              $('body').trigger('smi.contents.focus');
              $('#contents').addClass('focus');
            }
          }
        });
        $('body').keyup(function(e) {
          if (e.keyCode == 16 || e.keyCode == 17) {
            $('.focus').removeClass('highlight');
          }
        })
      },
      clipboard: function(action) {
        // Global clipboard
        var actions = {
          cut: function($items) {
            window.clipboard = $items;
            $(this).trigger('smi.clipboard.cut', $items);
            $SMI.SMINotification({
              title: "Cut " + window.clipboard.length + " item(s)",
              body: "The selected items are on the clipboard. Use the Paste action to paste the items from the clipboard. Cut items will not be moved until you paste them.",
              autoclose: 5000
            });
          },
          copy: function($items) {
            window.clipboard = $items.clone();
            $(this).trigger('smi.clipboard.copy', $items);
            $SMI.SMINotification({
              title: "Copied " + window.clipboard.length + " item(s)",
              body: "The selected items have been copied. Use the Paste action to paste the copied items.",
              autoclose: 5000
            });
          },
          paste: function() {
            var data = (window.clipboard) ? window.clipboard : [];
            window.clipboard = null;
            $(this).trigger('smi.clipboard.paste', data);
            return data;
          },
          clear: function() {
            window.clipboard = null;
            $(this).trigger('smi.clipboard.clear');
          },
          length: function() {
            $(this).trigger('smi.clipboard.length');
            return (window.clipboard && window.clipboard.length) ? window.clipboard.length : 0;
          }
        };
        if(actions[action]) {
          return actions[action].apply(this, Array.prototype.slice.call(arguments, 1));
        }
      },
      keybind: function(triggers, fn) {
        $SMI.SMI('unbind', triggers);
        if (!window.hotkeys) {
          window.hotkeys = {};
        }
        if (typeof(triggers) == 'string') {
          triggers = [triggers];
        }
        $.each(triggers, function(i, trigger){
          if (typeof(window.hotkeys[trigger]) != 'function') {
            shortcut.add(trigger, fn);
            window.hotkeys[trigger] = fn;
          }
        });
      },
      unbind: function(triggers) {
        if (!window.hotkeys) return;
        if (typeof(triggers) == 'string') {
          triggers = [triggers];
        }
        $.each(triggers, function(i, trigger){
          if (typeof(window.hotkeys[trigger]) == 'function') {
            shortcut.remove(trigger);
            window.hotkeys[trigger] = null;
          }
        });
      },
      bindonce: function(triggers, fn) {
        if (!window.hotkeys) return;
        if (typeof(triggers) == 'string') {
          triggers = [triggers];
        }
        $.each(triggers, function(i, trigger){
          var oldfn = $SMI.SMI('getbind', trigger);
          var newfn = function() {
            fn();
            if (oldfn) {
              $SMI.SMI('keybind', trigger, oldfn);
            }
          }
          $SMI.SMI('keybind', trigger, newfn);
        });
      },
      getbind: function(trigger) {
        var fn = window.hotkeys[trigger];
        return ($.isFunction(fn)) ? fn : null;
      },
      getbinds: function() {
        return (window.hotkeys) ? window.hotkeys : {};
      }
    };
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };
})(jQuery);