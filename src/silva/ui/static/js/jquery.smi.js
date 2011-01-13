(function($) {
  /**
   * Main SMI loader
   */
  $.fn.SMI = function(method) {
    var $SMI = this;
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
      },
      clipboard: function(action) {
        var actions = {
          cut: function(items) {
            window.clipboard = items;
            $SMI.SMIDialog({
              css: {
                width:'320px',
                height:'120px'
              },
              title: "Cut " + window.clipboard.length + " item(s)",
              caption: "The selected items are on the clipboard. Use the Paste action to paste the items from the clipboard. Cut items will not be moved until you paste them.",
              autoclose: 4000
            });
          },
          copy: function(items) {
            window.clipboard = items.clone();
            $SMI.SMIDialog({
              css: {
                width:'320px',
                height:'120px'
              },
              title: "Copied " + window.clipboard.length + " item(s)",
              caption: "The selected items have been copied. Use the Paste action to paste the copied items.",
              autoclose: 4000
            });
          },
          paste: function() {
            var data = (window.clipboard) ? window.clipboard : [];
            window.clipboard = null;
            return data;
          },
          clear: function() {
            window.clipboard = null;
          },
          length: function() {
            return (window.clipboard && window.clipboard.length) ? window.clipboard.length : 0;
          }
        };
        if(actions[action]) {
          return actions[action].apply(this, Array.prototype.slice.call(arguments, 1));
        }
      }
    };
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };
  
  /**
   * Disable or enable text selection
   */
  $.fn.disableTextSelect = function() {
    return this.each(function() {
      $(this).css({
        '-moz-user-select': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none'
      }).bind('selectstart', function() {
        return false;
      }).mousedown(function() {
        return false;
      });
    });
  };
  $.fn.enableTextSelect = function() {
    return this.each(function() {
      $(this).css({
        '-moz-user-select': 'text',
        '-webkit-user-select': 'text',
        'user-select': 'text'
      }).unbind('selectstart').mousedown(function() {
        return true;
      });
    });
  };
})(jQuery);