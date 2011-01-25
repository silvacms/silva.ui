(function($) {
  var methods = {
    init: function(source) {
      $(this).data('source', $(source));
      $(this).Selecter('update');

      $(this).bind('click.selecter', function(){
        $(this).Selecter('toggle');
      });
    },
    getstate: function() {
      var state;
      if ($(this).hasClass('none')) state = 'none';
      if ($(this).hasClass('partial')) state = 'partial';
      if ($(this).hasClass('all')) state = 'all';
      if ($(this).hasClass('single')) state += ' single';
      $(this).trigger('selecter.getstate', $(this).data());
      return state;
    },
    setstate: function(state, add) {
      if (!add) {
        $(this).removeClass('none single partial all');
      }
      if (!$(this).hasClass(state)) {
        $(this).addClass(state);
      }
      $(this).trigger('selecter.setstate', $(this).data());
    },
    toggle: function() {
      $(this).data('source').find('tr').click();
      $(this).Selecter('update');
      $(this).trigger('selecter.toggle', $(this).data());
    },
    update: function() {
      var totalRowCount = $(this).data('source').find('tr').length;
      var selectedCount = $(this).data('source').find('tr.selected').length;

      if (selectedCount == 0) {
        $(this).Selecter('setstate', 'none');
      } else if (selectedCount == totalRowCount) {
        $(this).Selecter('setstate', 'all');
      } else {
        $(this).Selecter('setstate', 'partial');
      }
      if (selectedCount == 1) {
        $(this).Selecter('setstate', 'single', true);
      }
      $(this).trigger('selecter.update', $(this).data());
    }
  };

  $.fn.Selecter = function(method) {
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };
})(jQuery);