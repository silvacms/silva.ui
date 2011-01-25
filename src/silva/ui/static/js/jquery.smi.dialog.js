(function($) {  
  /**
   * Dialog screens for SMI
   */
  $.fn.SMIDialog = function(method) {
    var self = $(this);
    var methods = {
      init: function(options) {
        // Get a deep copy of the currently bound keyboard shortcuts and disable them
        var existingBinds = $.extend(true, {}, $('body').SMI('getbinds'));
        $.each(existingBinds, function(key) {
          $('body').SMI('unbind', key);
        });
        // Remove dialog keyboard shortcuts and restore original shortcuts after closing
        $(this).live('dialog.close.first', function() {
          $.each($('body').SMI('getbinds'), function(key) {
            $('body').SMI('unbind', key);
          });
          $.each(existingBinds, function(key, fn) {
            $('body').SMI('keybind', key, fn);
          });
        });

        // Build overlay and dialog
        $(this).append('<div id="overlay"><div id="dialog"><div id="dialog_body"></div>\
        <div id="dialog_actions"><div class="actions_left"></div><div class="actions_right"></div></div>\
        </div></div>');
        if (options.css) {
          $('#dialog').css(options.css);
        }
        // Center the dialog box
        $('#dialog').css({
          marginLeft: -($('#dialog').outerWidth()/2),
          marginTop: -($('#dialog').outerHeight()/2)
        });

        // Title
        if (typeof(options.title) == 'string') {
          $('#dialog_body').prepend('<h2>'+options.title+'</h2>');
        }
        // Caption
        if (typeof(options.caption) == 'string') {
          $('#dialog_body').append('<p>'+options.caption+'</p>');
        }
        // Body
        if (typeof(options.body) == 'string') {
          $('#dialog_body').append('<div>'+options.body+'</div>');
        }
        // Actions
        for (var key in options.actions) {
          var action = options.actions[key];
          var position = (action.position == 'left') ? 'left' : 'right';
          var button = '<a rel="'+key+'" class="button">';
          if (action.icon) {
            button += '<ins class="icon action '+action.icon+'"></ins>';
          }
          button += action.title+'</a>';
          $('#dialog_actions').find('div.actions_'+position).append(button);
          if (action.keybind && typeof(action.handler) == 'function') {
            $('body').SMI('keybind', action.keybind, function() {
              $('#dialog_actions a[rel='+key+']').click();
            });
          }
        }
        // Default close button
        if (typeof(options.actions) == 'undefined' || typeof(options.actions.close) == 'undefined') {
          $('#dialog_actions').find('div.actions_right').append('<a rel="close" class="button"><ins class="icon action cancel"></ins>Close</a>');
        }

        // Setup autoclose timeout
        if(typeof options.autoclose == 'number') {
          var closeTimer = setTimeout(function(){
            $(self).SMIDialog('close');
          }, options.autoclose);
        }
        // Disable timeout if dialog is closed
        $(this).live('dialog.close.first', function() {
          if (closeTimer) clearTimeout(closeTimer);
        });

        // Catch dialog click to prevent propagation to the overlay
        $('#dialog').click(function(e) {
          e.stopPropagation();
        });
        // Close dialog on overlay click
        $('#overlay').click(function() {
          $(self).SMIDialog('close');
        });
        // Close dialog on escape key, restoring old keybind after closing
        $('body').SMI('bindonce', 'escape', function() {
          $(self).SMIDialog('close');
        });
        // Close dialog on enter key if there's no other actions
        if (!options.actions) {
          $('body').SMI('keybind', 'return', function() {
            $(self).SMIDialog('close');
          });
        }
        
        // Setup dialog action handlers
        $('#dialog_actions a').click(function(){
          var triggerClose = true;
          if (typeof(options.actions) == 'object') {
            if (options.actions[$(this).attr('rel')]) {
              if (typeof(options.actions[$(this).attr('rel')].handler) == 'function') {
                if (options.actions[$(this).attr('rel')].handler() === false) {
                  triggerClose = false;
                }
              }
              if (typeof(options.actions[$(this).attr('rel')].close) == 'boolean') {
                triggerClose = options.actions[$(this).attr('rel')].close;
              }
            }
          }
          if ($(this).attr('rel') == 'close' || triggerClose) {
            if (triggerClose) $(self).SMIDialog('close');
          }
        });

        // Focus first form field
        var $firstFormElement = $('input:visible, select:visible, textarea:visible', this).eq(0);
        if ($firstFormElement) $firstFormElement.focus();
      },
      close: function() {
        $(this).trigger('dialog.close.first');
        $('#dialog').fadeOut(200, function(){ $(this).remove(); });
        $('#overlay').fadeOut(300, function(){ $(this).remove(); });
        $(this).trigger('dialog.close.done');
      }
    };
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      alert('Method ' + method + ' does not exist');
    }
  };
})(jQuery);