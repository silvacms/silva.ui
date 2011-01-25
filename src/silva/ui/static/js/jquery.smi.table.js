(function($) {
  var methods = {
    init: function(options) {
      var $this = $(this);
      $(this).data('options', options);
      $(this).trigger('smarttable.init.first', $(this).data());
      $(this).html('<table><thead><tr></tr></thead><tbody></tbody></table>');

      // Row hover
      $(this).delegate('tbody tr', 'hover', function(){
        $(this).siblings('tr').removeClass("hover");
        $(this).toggleClass("hover");
        $this.trigger('smarttable.row.hover', $this.data());
      });

      // Row selection
      $(this).delegate('tbody tr', 'click', function(e){
        if (!e.shiftKey) {
          if ($(this).hasClass('selected')){
            $(this).removeClass('selected');
          } else {
            $(this).addClass('selected');
          }
        } else {
          if ($(this).prevAll('.selected').is('tr')) {
            $(this).prevUntil('.selected').andSelf().each(function(){
              $(this).toggleClass('selected');
            });
          } else if ($(this).nextAll('.selected').is('tr')) {
            $(this).nextUntil('.selected').andSelf().click();
          }
        }
        $this.trigger('smarttable.row.click', $this.data());
      });

      // Keyboard navigation
      $('body').SMI('keybind', ['up', 'down', 'shift+up', 'shift+down'], function(e) {
        if ($this.find('tbody tr.hover').length > 0) {
          var $current = $this.find('tbody tr.hover');
          $current.removeClass('hover');
          if (e.keyCode == 38) {
            if (e.shiftKey) $current.click();
            $current.prev('tr').addClass('hover');
          } else if (e.keyCode == 40) {
            if (e.shiftKey) $current.click();
            $current.next('tr').addClass('hover');
          }
        } else if (e.keyCode == 38) {
          $this.find('tbody tr:last').addClass('hover');
        } else if (e.keyCode == 40) {
          $this.find('tbody tr:first').addClass('hover');
        }
      });
      // Select a row with the spacebar
      $('body').SMI('keybind', ['space'], function() {
        if ($this.find('tbody tr.hover').length > 0) {
          $this.find('tbody tr.hover').click();
        }
      });
      // Move items up/down using ctrl + arrow
      $('body').SMI('keybind', ['ctrl+up', 'ctrl+down'], function(e) {
        // First wrap groups of selected items together in divs
        $this.find('tbody tr.selected').each(function(){
          if (!$(this).parent().is('div')) {
            $(this).nextUntil(':not(.selected)').andSelf().wrapAll('<div></div>');
          }
        });
        // Now move the wrappers
        $this.find('tbody div').each(function(){
          if (e.keyCode == 38) {
            $(this).insertBefore($(this).prev('tr'));
          } else if (e.keyCode == 40) {
            $(this).insertAfter($(this).next('tr'));
          }
          // Remove the wrapper when done
          $(this).replaceWith($(this).html());
        });
        $this.trigger('smarttable.row.move', $this.data());
      });
      // Deselect all rows on escape key
      $('body').SMI('keybind', 'escape', function() {
        $this.find('tbody tr.selected').click();
      });

      $.getJSON(options.columns_url, function(data) {
        $this.data('columns', data);
        $this.trigger('smarttable.init.columns', $this.data());
        $this.SmartTable('build');
      });
    },
    build: function() {
      var $this = $(this);
      $(this).trigger('smarttable.build.first', $(this).data());
      $.each($(this).data('columns'), function(i,col){
        $this.find('thead tr').append('<th>'+col['caption']+'</th>');
      });
      $.getJSON($(this).data('options')['data_url'], function(data) {
        $.each(data, function(i,row) {
          $this.SmartTable('addrow', row);
        });
        $this.trigger('smarttable.build.done', $this.data());
      });
    },
    addrow: function(data) {
      $(this).trigger('smarttable.row.add.first', $(this).data(), data);
      var $row = $(this).find('tbody').append('<tr></tr>').find('tr:last');
      $row.data('data', data);
      $(this).SmartTable('buildrow', $row);
      $(this).trigger('smarttable.row.add.done', $(this).data(), $row);
    },
    buildrow: function($row) {
      var rowdata = $row.data('data');
      $(this).trigger('smarttable.row.build.first', $(this).data(), $row);
      $row.empty();
      $.each($(this).data('columns'), function(i, coldata){
        if (rowdata[coldata.name] && rowdata[coldata.name].caption) {
          if (rowdata[coldata.name].link) {
            $row.append('<td><a href="' + rowdata[coldata.name].link + '">' + rowdata[coldata.name].caption + '</a></td>');
          } else if (rowdata[coldata.name].rel) {
            $row.append('<td><a rel="' + rowdata[coldata.name].rel + '">' + rowdata[coldata.name].caption + '</a></td>');
          } else {
            $row.append('<td>' + rowdata[coldata.name].caption + '</td>');
          }
        } else {
          $row.append('<td></td>');
        }
      });
      $(this).trigger('smarttable.row.build.done', $(this).data(), $row);
    },
    removerow: function($row) {
      $(this).trigger('smarttable.row.delete.first', $(this).data(), $row);
      $row.remove();
      $(this).trigger('smarttable.row.delete.done', $(this).data(), $row);
    },
    addcolumns: function(columns, prepend) {
      var existing = $(this).data('columns');
      if (prepend) {
        columns = columns.concat(existing);
      } else {
        columns = existing.concat(columns);
      }
      $(this).data('columns', columns);
      $(this).trigger('smarttable.addcolumns.done', $(this).data());
    },
    update: function() {
      $(this).trigger('smarttable.update.first', $(this).data());
      $(this).trigger('smarttable.update.done', $(this).data());
    },
    updatecell: function($row, key, value) {
      $(this).trigger('smarttable.cell.update.first', $row, key, value);
      var rowdata = $row.data('data');
      var keys = key.split('.');
      if (keys.length == 1) {
        rowdata[keys[0]] = value;
      } else if (keys.length == 2) {
        rowdata[keys[0]][keys[1]] = value;
      } else if (keys.length == 3) {
        rowdata[keys[0]][keys[1]][keys[2]] = value;
      } else {
        return;
      }
      $row.data('data', rowdata);
      $(this).SmartTable('buildrow', $row);
      $(this).trigger('smarttable.cell.update.done', $row, key, value);
    },
    getstate: function() {
      return $(this).find('tbody').findState('tr', 'tr.selected');
    }
  };

  $.fn.SmartTable = function(method) {
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };
})(jQuery);