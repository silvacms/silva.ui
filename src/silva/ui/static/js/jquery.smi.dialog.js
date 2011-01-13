(function($) {  
  /**
   * Disable native browser events
   */
  $.fn.disableNativeEvents = function() {
    return this.each(function() {
      $(this).css({
        'MozUserSelect' : 'none'
      }).bind('selectstart', function() {
        return false;
      }).mousedown(function() {
        return false;
      });
    });
  };

  /**
   * Dialog screens for SMI
   */
  $.fn.SMIDialog = function(method) {
    var self = $(this);
    var methods = {
      init: function(options) {
        $(this).append('<div id="overlay"><div id="dialog"><div id="dialog_body"></div>\
        <div id="dialog_actions"><div class="actions_left"></div><div class="actions_right"></div></div>\
        </div></div>');
        if (options.css) {
          for (var key in options.css) {
            $('#dialog').css(key, options.css[key]);
          }
        }
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
          if (typeof(action.handler) == 'function') {
            $(document).keydown(function(e) {
              if (typeof(action.keybind) == 'number') {
                if (e.keyCode == action.keybind) {
                  e.preventDefault();
                  $('#dialog_actions a[rel='+key+']').click();
                  return false;
                }
              }
              if (typeof(action.ctrlbind) == 'number' && e.ctrlKey) {
                if (e.keyCode == action.ctrlbind) {
                  e.preventDefault();
                  $('#dialog_actions a[rel='+key+']').click();
                  return false;
                }
              }
            });
          }
        }
        // Default close button
        if (typeof(options.actions) == 'undefined' || typeof(options.actions.close) == 'undefined') {
          $('#dialog_actions').find('div.actions_right').append('<a rel="close" class="button"><ins class="icon action cancel"></ins>Close</a>');
        }

        // Setup autoclose timeout
        var closeTimer = 0;
        if(typeof options.autoclose == 'number') {
          closeTimer = setTimeout(function(){
            $(self).SMIDialog('close');
          }, options.autoclose);
        }

        // Catch dialog click to prevent propagation to the overlay
        $('#dialog').click(function(e) {
          e.stopPropagation();
        });
        // Close dialog on overlay click
        $('#overlay').click(function() {
          $(self).SMIDialog('close', closeTimer);
        });
        // Close dialog on escape key
        $(document).keydown(function(e) {
          if (e.keyCode == 27) {
            e.preventDefault();
            $(self).SMIDialog('close', closeTimer);
            return false;
          }
        });
        
        // Setup dialog action handlers
        $('#dialog_actions a').click(function(){
          var triggerClose = true;
          if (typeof(options.actions) == 'object') {
            if (options.actions[$(this).attr('rel')]) {
              if (typeof(options.actions[$(this).attr('rel')].handler) == 'function') {
                options.actions[$(this).attr('rel')].handler();
              }
              if (typeof(options.actions[$(this).attr('rel')].close) == 'boolean') {
                triggerClose = options.actions[$(this).attr('rel')].close;
              }
            }
          }
          if ($(this).attr('rel') == 'close' || triggerClose) {
            if (triggerClose) $(self).SMIDialog('close', closeTimer);
          }
        });
      },
      close: function(closeTimer) {
        if (closeTimer) clearTimeout(closeTimer);
        $('#dialog').fadeOut(200, function(){ $(this).remove(); });
        $('#overlay').fadeOut(300, function(){ $(this).remove(); });
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