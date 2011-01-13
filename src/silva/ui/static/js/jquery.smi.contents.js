(function($) {
  /**
   * Set 'odd' or 'even' class on table rows
   */
  $.fn.setOddEven = function() {
    return this.each(function() {
      $(this).find("tr").removeClass('odd').removeClass('even');
      $(this).find("tr").each(function(i) {
        $(this).addClass((i+1)%2==0 ? 'even' : 'odd');
      });
    });
  };

  /**
   * Set 'dragHandle' class on first column in table
   */
  $.fn.setDragHandle = function() {
    return this.each(function() {
      $(this).find("tr").each(function() {
        $(this).find('th').eq(0).addClass('dragHandle');
        $(this).find('td').eq(0).addClass('dragHandle');
      });
    });
  };

  /**
   * Calculate and set percentual widths on table columns based on the
   * automatically determined width of columns. In other words: let the
   * browser set the size of the columns based on contents, and then
   * fix those proportions so they remain when resizing the window.
   */
  $.fn.fixColWidths = function() {
    return this.each(function() {
      var colWidths = [];
      var totalWidth = 0;
      $(this).find("#SMIContents_rows tr:first td").each(function(colNum) {
        colWidths[colNum] = (colNum == 0) ? 32 : $(this).width();
        totalWidth += (colNum == 0) ? 32 : $(this).width();
      });
      var colPctWidth = 0;
      for (var i in colWidths) {
        colPctWidth = Math.round(colWidths[i] / totalWidth * 100);
        $(this).find("table").css("table-layout", "fixed");
        $(this).find("tr").each(function() {
          $(this).children().eq(i).css("width", colPctWidth+"%");
        });
      }
    });
  };

  /**
   * SMIMain contents screen
   *
   * Shows a table listing the contents of a folder or publication.
   */
  $.fn.SMIContents = function(method) {
    var $SMIContents = this;

    var actions = {
      cut: {
        title: 'Cut',
        triggers: ['all', 'partial'],
        handler: function(source, items){
          $('body').SMI('clipboard', 'cut', items);
        }
      },
      copy: {
        title: 'Copy',
        triggers: ['all', 'partial'],
        handler: function(source, items){
          $('body').SMI('clipboard', 'copy', items);
        }
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
                  keybind: 13,
                  ctrlbind: 83
                }
              }
            });
          } else {
            alert('Use full page form for renaming...');
          }
        }
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
                keybind: 13,
                ctrlbind: 83
              }
            }
          });
        },
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

    $.fn.getTitle = function() {
      var icon = $(this).parent().parent().find('ins').eq(0).parent().html();
      var title = $.trim($(this).parent().parent().find('a[rel=editor], a[rel=contents]').text());
      return icon + title;
    };

    $.fn.buildActionButtons = function(source, classes) {
      var $buttons = $(this);
      var items = $(source).find('.selected');
      $buttons.unbind('click');
      $buttons.addClass('disabled');
      $buttons.each(function(){
        var action = actions[$(this).attr('rel')];
        if (action) {
          if (action.hide) {
            $(this).addClass('hidden');
          }
          if (action.handler) {
            if (action.trigger) {
              if (typeof(action.trigger) == 'function') {
                if (action.trigger(source, items, classes)) {
                  $(this).removeClass('disabled hidden');
                  $(this).click(function(){
                    action.handler(source, items, classes[state]);
                    $buttons.buildActionButtons(source, classes);
                  });
                }
              }
            } else if (action.triggers) {
              findOverlap:
              for (var trigger in action.triggers) {
                for (var state in classes) {
                  if (classes[state] == action.triggers[trigger]) {
                    $(this).removeClass('disabled hidden');
                    $(this).click(function(){
                      action.handler(source, items, classes[state]);
                      $buttons.buildActionButtons(source, classes);
                    });
                    break findOverlap;
                  }
                }
              }
            } else {
              $(this).removeClass('disabled hidden');
              $(this).click(function(){
                action.handler(source, items, classes);
                $buttons.buildActionButtons(source, classes);
              });
            }
          }
          if (action.css) {
            for (var key in action.css) {
              $(this).css(key, action.css[key]);
            }
          }
        }
      });
    };

    var methods = {
      init: function(options) {
        $.getJSON(options.data_url, function(data) {
          var html = '<div id="SMIContents_head"><table><tr>';
          html += '<th></th><th class="col_title">Title</th><th class="col_author">Author</th><th class="col_modified">Modified</th>';
          html += '</tr></table></div><div id="SMIContents_rows"><table class="rowbg">';
          $.each(data, function(i,row) {
            html += '<tr id="r'+(i+1)+'">';
            html += '<td><ins class="icon ' + row.icon + '"></ins></td>';
            html += '<td><ins class="icon state ' + row.state + '" title="' + row.state + '"></ins>';
            html += '<a rel="' + ((row.rel) ? row.rel : 'editor') + '">' + row.title + '</a></td>';
            html += '<td><a rel="properties">' + row.author + '</a></td>';
            html += '<td><a rel="history">' + row.modified + '</a></td>';
            html += '</tr>';
          });
          html += '</table></div><div id="SMIContents_foot"><div class="left">';
          html += '<ins id="SMIContents_selecter" class="icon checkbox none"></ins>';
          for (var action in actions) {
            html += '<a rel="' + action + '">' + actions[action].title + '</a>';
          }
          html += '</div></div>';
          $SMIContents.removeClass('loading');
          $SMIContents.html(html).setDragHandle().fixColWidths()
          .find('#SMIContents_rows').setOddEven()
          .find("table").tableDnD({
            dragHandle: "dragHandle",
            onDragClass: "dragging",
            onDragStart: function(t) {
              $(t).removeClass('rowbg');
            },
            onDrop: function(t) {
              $SMIContents.setOddEven("#SMIContents_rows tr");
              $(t).addClass('rowbg');
            }
          });
          $('#SMIContents_foot a').buildActionButtons(
            '#SMIContents_rows tbody', $('#SMIContents_selecter').attr('class').split(/\s+/)
          );

          $('#SMIContents_rows').delegate('a', 'click', function(event){
            event.preventDefault();
            var rel = $(this).attr('rel');
            switch (rel) {
              case 'contents':
                $("#contents").SMIMain(rel, 'folder', $(this).getTitle(), 'data/files.json');
                break;
              case 'editor':
                $("#contents").SMIMain(rel, 'file', $(this).getTitle(), 'data/file.html');
                break;
              case 'properties':
                $("#contents").SMIMain(rel, 'file', $(this).getTitle(), 'data/file.html');
                break;
              case 'history':
                $("#contents").SMIMain(rel, 'file', $(this).getTitle(), 'data/file.html');
                break;
              case 'access':
                $("#contents").SMIMain(rel, 'file', $(this).getTitle(), 'data/file.html');
                break;
            }
          });

          $('#SMIContents_rows').delegate('tr', 'click', function(){
            if($(this).hasClass('selected')){
              $(this).removeClass('selected');
            } else {
              $(this).addClass('selected');
            }
            var selectedCount = $(this).parent('tbody').find('tr.selected').length;
            var totalRowCount = $(this).parent('tbody').find('tr').length;

            $('#SMIContents_selecter').removeClass('none all partial single');
            if (selectedCount == 0) {
              $('#SMIContents_selecter').addClass('none');
            } else if (selectedCount == totalRowCount) {
              $('#SMIContents_selecter').addClass('all');
            } else {
              $('#SMIContents_selecter').addClass('partial');
            }
            if (selectedCount == 1) {
              $('#SMIContents_selecter').addClass('single');
            }
            $('#SMIContents_foot a').buildActionButtons(
              '#SMIContents_rows tbody', $('#SMIContents_selecter').attr('class').split(/\s+/)
            );
          });

          $('#SMIContents_selecter').click(function(){
            if($(this).hasClass('all')) {
              $('#SMIContents_rows tr').removeClass('selected');
              $(this).removeClass('all').addClass('none');
            } else {
              $('#SMIContents_rows tr').addClass('selected');
              $(this).removeClass('partial none').addClass('all');
            }
            if ($('#SMIContents_rows tr.selected').length == 1) {
              $('#SMIContents_selecter').addClass('single');
            } else {
              $('#SMIContents_selecter').removeClass('single');
            }
            $('#SMIContents_foot a').buildActionButtons(
              '#SMIContents_rows tbody', $('#SMIContents_selecter').attr('class').split(/\s+/)
            );
          });
        });
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