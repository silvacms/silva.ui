(function($) {



  /// OLD STUFF





  var actions = {
    cut: {
      title: 'Cut',
      triggers: ['all', 'partial'],
      handler: function(source, items){
        $('body').SMI('clipboard', 'cut', items);
      },
      keybind: 'ctrl+x'
    },
    copy: {
      title: 'Copy',
      triggers: ['all', 'partial'],
      handler: function(source, items){
        $('body').SMI('clipboard', 'copy', items);
      },
      keybind: 'ctrl+c'
    },
    paste: {
      title: 'Paste',
      trigger: function(){
        return $('body').SMI('clipboard', 'length') > 0;
      },
      handler: function(source){
        if ($('body').SMI('clipboard', 'length') > 0) {
          $(source).append($('body').SMI('clipboard', 'paste'));
        }
      },
      keybind: 'ctrl+v',
      css: {
        'margin-right': '8px'
      }
    },
    rename: {
      title: 'Rename',
      triggers: ['single', 'partial', 'all'],
      handler: function(source, items, trigger){
        if (trigger == 'single') {
          var oldtitle = $(items[0]).find('a[rel=editor]').text();
          $('body').SMIDialog({
            css: {
              'width': '300px',
              'height': '120px'
            },
            title: "Rename item",
            caption: '<small>Set a new title:</small><br/><input type="text" name="newtitle" size="41" value="' + oldtitle + '" />',
            actions: {
              close: {
                title: 'Cancel',
                icon: 'cancel'
              },
              save: {
                title: 'Save',
                icon: 'confirm',
                handler: function(){
                  $(items[0]).find('a[rel=editor]').text($('input[name=newtitle]').val());
                },
                keybind: 'return'
              }
            }
          });
        } else {
          alert('Use full page form for renaming...');
        }
      },
      keybind: 'ctrl+r'
    },
    remove: {
      title: 'Delete',
      triggers: ['all', 'partial'],
      handler: function(source, items){
        $('body').SMIDialog({
          css: {
            'width': '300px',
            'height': '100px'
          },
          title: "Delete " + items.length + " item(s)",
          caption: "Are you sure you want to delete " + items.length + " item(s)?",
          actions: {
            close: {
              title: 'Cancel',
              icon: 'cancel'
            },
            save: {
              title: 'Delete',
              icon: 'confirm',
              handler: function(){
                $(items).each(function(){
                  $(this).remove();
                });
              },
              keybind: 'return'
            }
          }
        });
      },
      keybind: ['delete', 'ctrl+d'],
      css: {
        'margin-right': '8px'
      }
    },
    commit: {
      title: 'Commit',
      trigger: function(source, items){
        var enabled = $(items).length > 0;
        $(items).find('ins.state').each(function(){
          if (!$(this).hasClass('draft')) {
            enabled = false;
          }
        });
        return enabled;
      },
      handler: function(){
        alert('Submit for approval');
      },
      hide: true
    },
    approve: {
      title: 'Approve',
      trigger: function(source, items){
        var enabled = $(items).length > 0;
        $(items).find('ins.state').each(function(){
          if (!$(this).hasClass('pending')) {
            enabled = false;
          }
        });
        return enabled;
      },
      handler: function(){
        alert('Approve');
      },
      hide: true
    },
    publish: {
      title: 'Publish',
      trigger: function(source, items){
        var enabled = $(items).length > 0;
        $(items).find('ins.state').each(function(){
          if (!$(this).hasClass('approved')) {
            enabled = false;
          }
        });
        return enabled;
      },
      handler: function(){
        alert('Publish');
      },
      hide: true
    },
    close: {
      title: 'Close',
      trigger: function(source, items, classes){
        var enabled = $(items).length > 0;
        $(items).find('ins.state').each(function(){
          if (!$(this).hasClass('published')) {
            enabled = false;
          }
        });
        return enabled;
      },
      handler: function(){
        alert('Close');
      },
      hide: true
    }
  };
  
  var methods = {
    init: function(options) {
      $(this).disableTextSelect();
      $.getJSON(options.data_url, function(data) {
        var html = '<div id="SMIContents_head"><table><tr>';
        html += '<th></th><th class="col_title">Title</th><th class="col_author">Author</th><th class="col_modified">Modified</th>';
        html += '</tr></table></div><div id="SMIContents_rows"><table class="rowbg">';
        $.each(data, function(i,row) {
          html += '<tr id="r'+(i+1)+'" class="' + row.icon + ' ' + row.state + '">';
          html += '<td><ins class="icon ' + row.icon + '"></ins></td>';
          html += '<td><ins class="icon state ' + row.state + '" title="' + row.state + '"></ins>';
          html += '<a rel="' + (row.rel ? row.rel : 'editor') + '" title="' + row.title + ' (' + row.state + ')' + '">' + (row.shorttitle ? row.shorttitle : row.title) + '</a></td>';
          html += '<td><a rel="properties">' + row.author + '</a></td>';
          html += '<td><a rel="history">' + row.modified + '</a></td>';
          html += '</tr>';
        });
        html += '</table></div><div id="SMIContents_foot"><div class="left">';
        html += '<ins id="SMIContents_selecter" class="icon checkbox"></ins>';
        html += '<div id="SMIContents_actions"></div></div></div>';
        $(this).removeClass('loading');
        $(this).html(html).setColumnClass(0, 'dragHandle')
        .find('#SMIContents_rows table').fixColWidths({
          fixedColumns: {0:32}
        }).setClassSequence().tableDnD({
          dragHandle: "dragHandle",
          onDragClass: "dragging",
          onDragStart: function(t) {
            $(t).removeClass('rowbg');
          },
          onDrop: function(t) {
            $("#SMIContents_rows").setClassSequence();
            $(t).addClass('rowbg');
          }
        });
        $('#SMIContents_head table').fixColWidths({source: '#SMIContents_rows table'});

        // Build selecter
        $('#SMIContents_foot').prepend('<div id="SMIContents_selecter"></div>');
        $('#SMIContents_selecter').Selecter($('#SMIContents_rows').find('table'));

        // Build actions
        $('#SMIContents_actions').ActionButtons({actions: actions, source: $('#SMIContents_rows').find('table')});

        // Row hover, must be implemented with JS to allow override by keyboard
        $('#SMIContents_rows tr').hover(function(){
          $(this).addClass('hover');
        }, function(){
          $(this).removeClass('hover').siblings('tr').removeClass('hover');
        });

        // Keyboard navigation
        $('body').SMI('keybind', ['up', 'down'], function(e) {
          if ($('#SMIContents_rows tr.hover').length > 0) {
            var $current = $('#SMIContents_rows tr.hover');
            $current.removeClass('hover');
            if (e.keyCode == 38) {
              $current.prev('tr').addClass('hover');
            } else if (e.keyCode == 40) {
              $current.next('tr').addClass('hover');
            }
          } else if (e.keyCode == 38) {
            $('#SMIContents_rows tr:last').addClass('hover');
          } else if (e.keyCode == 40) {
            $('#SMIContents_rows tr:first').addClass('hover');
          }
        });
        // Select a row with the spacebar
        $('body').SMI('keybind', ['space'], function() {
          if ($('#SMIContents_rows tr.hover').length > 0) {
            $('#SMIContents_rows tr.hover').click();
          }
        });
        // Move items up/down using ctrl + arrow
        $('body').SMI('keybind', ['ctrl+up', 'ctrl+down'], function(e) {
          // First wrap groups of selected items together in divs
          $('#SMIContents_rows tr.selected').each(function(){
            if (!$(this).parent().is('div')) {
              $(this).nextUntil(':not(.selected)').andSelf().wrapAll('<div></div>');
            }
          });
          // Now move the wrappers
          $('#SMIContents_rows div').each(function(){
            if (e.keyCode == 38) {
              $(this).insertBefore($(this).prev('tr'));
            } else if (e.keyCode == 40) {
              $(this).insertAfter($(this).next('tr'));
            }
            // Remove the wrapper when done
            $(this).replaceWith($(this).html());
          });
          // Finally recalculate odd/even
          $("#SMIContents_rows").setClassSequence();
        });
        // Deselect all rows on escape key
        $('body').SMI('keybind', 'escape', function() {
          $('#SMIContents_rows tr.selected').click();
        });

        // Toggle row selection
        $('#SMIContents_rows').delegate('tr', 'click', function(e){
          if (!e.shiftKey) {
            if ($(this).hasClass('selected')){
              $(this).removeClass('selected');
            } else {
              $(this).addClass('selected');
            }
          } else {
            if ($(this).prevAll('.selected').is('tr')) {
              $(this).prevUntil('.selected').andSelf().click();
            } else if ($(this).nextAll('.selected').is('tr')) {
              $(this).nextUntil('.selected').andSelf().click();
            }
          }

          $('#SMIContents_selecter').Selecter('update');

          $('#SMIContents_foot a').buildActionButtons(
            '#SMIContents_rows tbody', $('#SMIContents_selecter').Selecter('getState')
          );
        });

        // Column links
        $('#SMIContents_rows').delegate('a', 'click', function(event){
          event.preventDefault();
          var rel = $(this).attr('rel');
          switch (rel) {
            case 'contents':
              $("#contents").SMIMain(rel, 'folder', $(this).closest('tr').rangeFilter(i, 1), 'data/files.json');
              break;
            case 'editor':
              $("#contents").SMIMain(rel, 'file', $(this).getCell(), 'data/file.html');
              break;
            case 'properties':
              $("#contents").SMIMain(rel, 'file', $(this).getCell(), 'data/file.html');
              break;
            case 'history':
              $("#contents").SMIMain(rel, 'file', $(this).getCell(), 'data/file.html');
              break;
            case 'access':
              $("#contents").SMIMain(rel, 'file', $(this).getCell(), 'data/file.html');
              break;
          }
        });
      });
    }
  };

  /**
   * SMIMain contents screen
   *
   * Shows a table listing the contents of a folder or publication.
   */
  $.fn.SMIContents = function(method) {
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    }
  };
})(jQuery);