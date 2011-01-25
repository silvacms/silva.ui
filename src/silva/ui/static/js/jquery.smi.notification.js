(function($) {  
  /**
   * Dialog screens for SMI
   */
  $.fn.SMINotification = function(method) {
    var $self = $(this);
    var methods = {
      init: function(options) {
        // Build overlay and dialog
        if (!$(this).find('#notifications').is('div')) {
          $(this).append('<div id="notifications"></div>');
        }
        var $this = $(this).find('#notifications');
        $this.prepend('<div class="notification"></div>');
        var $self = $this.find('.notification').eq(0);

        // Title
        if (typeof(options.title) == 'string') {
          $self.prepend('<h3>'+options.title+'</h3>');
        }
        // Body
        if (typeof(options.body) == 'string') {
          $self.append('<p>'+options.body+'</p>');
        }
        // Close button
        $self.click(function() {
          $self.trigger('notification.close');
        });
        
        // Setup autoclose timeout
        if(typeof options.autoclose == 'number') {
          $self.data('closetimer', setTimeout(function(){
            $self.trigger('notification.close');
          }, options.autoclose));
        }
        $self.bind('notification.close', function() {
          // Disable timeout if dialog is closed
          if ($self.data('closetimer')) {
            clearTimeout($self.data('closetimer'));
            $self.data('closetimer', null);
          }
          $self.animate({ height:0, opacity:0 }, 'slow', function() {
            $self.remove();
            if($this.find('.notification').length == 0) {
              $self.trigger('notifications.close');
            }
          });
        });
        $this.live('notifications.close', function() {
          $this.fadeOut('slow', function() {
            $this.remove();
          });
        });
      }
    };
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };
})(jQuery);