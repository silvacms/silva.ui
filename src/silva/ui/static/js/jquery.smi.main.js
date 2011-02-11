/**
 * Main SMI screen, with several possible subscreens
 *
 * contents: Table of folder/publication contents
 * editor: CKEditor for editing/creating a page/document
 * properties: Form for changing properties such as metadata
 * history: Table of publication history
 */
(function($) {
  var actions = {
    cut: {
      caption: 'Cut',
      triggers: ['all', 'partial'],
      handler: function(source, items){
        $('body').SMI('clipboard', 'cut', items);
        $(this).trigger('actionbuttons.cut.done');
      },
      keybind: 'ctrl+x'
      
    },
    copy: {
      caption: 'Copy',
      triggers: ['all', 'partial'],
      handler: function(source, items){
        $('body').SMI('clipboard', 'copy', items);
        $(this).trigger('actionbuttons.copy.done');
      },
      keybind: 'ctrl+c'
    },
    paste: {
      caption: 'Paste',
      trigger: function(){
        return $('body').SMI('clipboard', 'length') > 0;
      },
      handler: function(source){
        if ($('body').SMI('clipboard', 'length') > 0) {
          $(source).append($('body').SMI('clipboard', 'paste'));
        }
        $("#SMIContents_rows").trigger('actionbuttons.paste.done');
        var tableheight = $("#SMIContents_rows table").outerHeight();
        var blockheight = $("#SMIContents_rows").outerHeight();
        if (tableheight > blockheight) {
          $("#SMIContents_rows").smartScroll('slow', 'down', tableheight - blockheight);
        }
      },
      keybind: 'ctrl+v',
      css: {
        'margin-right': '8px'
      }
    },
    rename: {
      caption: 'Rename',
      triggers: ['single', 'partial', 'all'],
      handler: function(source, rows){
        if (rows.length == 1) {
          var oldtitle = $(rows[0]).data('data').title.caption;
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
                  $('#SMIContents').SmartTable('updatecell', $(rows[0]), 'title.caption', $('input[name=newtitle]').val());
                },
                keybind: 'return'
              }
            }
          });
        } else if (rows.length > 1) {
          alert('Use full page form for renaming...');
        }
      },
      keybind: 'ctrl+r'
    },
    remove: {
      caption: 'Delete',
      triggers: ['all', 'partial'],
      handler: function(source, rows){
        $('body').SMIDialog({
          css: {
            'width': '300px',
            'height': '100px'
          },
          title: "Delete " + rows.length + " item(s)",
          caption: "Are you sure you want to delete " + rows.length + " item(s)?",
          actions: {
            close: {
              title: 'Cancel',
              icon: 'cancel'
            },
            save: {
              title: 'Delete',
              icon: 'confirm',
              handler: function(){
                $(rows).each(function(){
                  $('#SMIContents').SmartTable('removerow', $(this));
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
      caption: 'Commit',
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
      caption: 'Approve',
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
      caption: 'Publish',
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
      caption: 'Close',
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
    },
    help: {
      caption: 'Help',
      css: {
        'float': 'right',
        'margin-right': '3px'
      },
      handler: function(){
        $('body').SMIDialog({
          css: {
            'width': '275px',
            'height': '310px'
          },
          title: "Keyboard shortcuts",
          caption: "<table style=\"margin:8px; width:100%;\">\
                    <tr><td>F1:</td><td>show help</td></tr>\
                    <tr><td>ctrl + shift + left/right:</td><td>switch focus area</td></tr>\
                    <tr><td>pageup/pagedown:</td><td>scroll up/down</td></tr>\
                    <tr><td>up/down arrows:</td><td>navigate rows</td></tr>\
                    <tr><td>space:</td><td>select/deselect row</td></tr>\
                    <tr><td>ctrl + up/down:</td><td>move row(s)</td></tr>\
                    <tr><td>shift + click:</td><td>select multiple rows</td></tr>\
                    <tr><td>shift + up/down:</td><td>select multiple rows</td></tr>\
                    <tr><td>escape:</td><td>deselect all rows</td></tr>\
                    <tr><td>ctrl + x:</td><td>cut row</td></tr>\
                    <tr><td>ctrl + c:</td><td>copy row</td></tr>\
                    <tr><td>ctrl + v:</td><td>paste row</td></tr>\
                    <tr><td>ctrl + r:</td><td>rename row</td></tr>\
                    <tr><td>ctrl + d:</td><td>delete row</td></tr>\
                    <tr><td>del:</td><td>delete row</td></tr>\
                    </table>"
        });
      },
      keybind: ['f1']
    }
  };

  var methods = {
    init: function(data_url, configuration_url) { // Load root
      $(this).SMIMain('contents', 'folder', '<ins class="icon silvalogo"></ins>Infrae', data_url, configuration_url);
      $('body').live('smi.contents.blur', function() {
        var keybinds = $.extend(true, {}, $('body').SMI('getbinds'));
        $('#contents').data('keybinds', keybinds);
        $.each(keybinds, function(key) {
          $('body').SMI('unbind', key);
        });
      });
      $('body').live('smi.contents.focus', function() {
        var keybinds = $('#contents').data('keybinds');
        if (keybinds) {
          $.each(keybinds, function(key, fn) {
            $('body').SMI('keybind', key, fn);
          });
        }
      });
    },
    contents: function(type, title, data_url, configuration_url) {
      $(this).trigger('smimain.load', 'contents');
      $(this).live('smimain.load', function(){
        $("#SMIContents").die();
        $("#SMIContents").empty();
      });
      $(this).removeClass().addClass('SMIContents');
      $(this).html('<div id="SMIInfo"></div><div id="SMIContents"></div>');
      $(this).trigger('smimain.contents.first', $(this).data());
      $("#SMIInfo").SMIInfo({
        mode: 'contents',
        type: type,
        title: title,
        data_url: data_url,
        tabs: {
          editor: (type == 'file') ? 'Contents' : null,
          contents: (type == 'folder') ? 'Contents' : null,
          properties: 'Properties',
          history: 'History',
          access: 'Access'
        },
        buttons: {
          liveview: 'View on site'
        }
      });
      $("#SMIContents").disableTextSelect();
      $("#SMIContents").live('smarttable.init.columns', function(){
        $("#SMIContents").SmartTable('addcolumns', [{name: "dragHandle", caption: ""}], true);
      });
      $("#SMIContents").live('smarttable.build.done', function(){
        // Split into two separate tables, to allow for scrolling with fixed heading
        $("#SMIContents>table").children().unwrap();
        $("#SMIContents>thead").wrap('<div id="SMIContents_head"><table></table></div>');
        $("#SMIContents>tbody").wrap('<div id="SMIContents_rows"><table class="rowbg"></table></div>');
        // Add set dragHandle class on first column
        $("#SMIContents").setColumnClass([0], 'dragHandle');
        // Fix table layout, add row coloring and allow drag&drop rows
        $("#SMIContents_rows table").setClassSequence().fixColWidths({
          fixedColumns: {0:32}
        }).tableDnD({
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
        // Insert icons
        $("#SMIContents_rows tr").each(function() {
          var icon = $(this).data('data').icon;
          var state = '<ins class="state ' + $(this).data('data').state + '"></ins>';
          if (icon.indexOf('.') == -1) {
            icon = '<ins class="icon ' + icon + '"></ins>';
          } else {
            icon = '<ins class="icon" style="background:url('+icon+') no-repeat center center;"></ins>';
          }
          $(this).find('td').eq(0).html(icon);
          $(this).find('td').eq(1).prepend(state);
        });
        // Create footer
        $("#SMIContents").append('<div id="SMIContents_foot"></div>');

        $('#SMIContents_head table').fixColWidths({source: '#SMIContents_rows table'});
        $('#SMIContents_foot').prepend('<ins id="SMIContents_selecter" class="icon checkbox"></ins>');
        $('#SMIContents_selecter').Selecter($('#SMIContents_rows').find('table'));
        $('#SMIContents_foot').append('<div id="SMIContents_actions"></div>');
        $('#SMIContents_actions').ActionButtons({actions: actions, source: $('#SMIContents_rows').find('table')});

        // Add event listeners to keep table layout/design in sync when changing its contents
        $("#SMIContents").live('smarttable.row.build.done', function(){
          $("#SMIContents_rows table").fixColWidths({fixedColumns: {0:32}});
          $('#SMIContents_head table').fixColWidths({source: '#SMIContents_rows table'});
        });
        $("#SMIContents").live('smarttable.row.move', function(){
          $(this).trigger('smarttable.update.done');
        });
        $("#SMIContents").live('smarttable.row.add.done', function(){
          $(this).trigger('smarttable.update.done');
        });
        $("#SMIContents").live('smarttable.row.delete.done', function(){
          $(this).trigger('smarttable.update.done');
        });
        $("#SMIContents").live('actionbuttons.paste.done', function(){
          $(this).trigger('smarttable.update.done');
        });
        $("#SMIContents").live('smarttable.update.done', function(){
          $(this).find('tbody').setClassSequence();
          $('#SMIContents_selecter').Selecter('update');
        });
        $("#SMIContents").live('smarttable.row.click', function(){
          $('#SMIContents_selecter').Selecter('update');
        });
      });
      // Scroll up/down using pageup/pagedown
      $('body').SMI('keybind', ['pageup', 'pagedown'], function(e) {
        var rowheight = $("#SMIContents_rows tr:first").outerHeight();
        var scrollsize = rowheight * 10;
        if (e.keyCode == 33) {
          $("#SMIContents_rows").smartScroll('slow', 'up', scrollsize, rowheight);
        } else if (e.keyCode == 34) {
          $("#SMIContents_rows").smartScroll('slow', 'down', scrollsize, rowheight);
        }
      });
      // Column links
      $('#SMIContents_rows a').live('click', function(event){
        event.preventDefault();
        var rel = $(this).attr('rel');
        switch (rel) {
          case 'contents':
            $("#contents").SMIMain(rel, 'folder', $(this).closest('tr').getCell(1).text(), 'data/files.json');
            break;
          case 'editor':
            $("#contents").SMIMain(rel, 'file', $(this).closest('tr').getCell(1).text(), 'data/file.html');
            break;
          case 'properties':
            $("#contents").SMIMain(rel, 'file', $(this).closest('tr').getCell(1).text(), 'data/file.html');
            break;
          case 'history':
            $("#contents").SMIMain(rel, 'file', $(this).closest('tr').getCell(1).text(), 'data/file.html');
            break;
          case 'access':
            $("#contents").SMIMain(rel, 'file', $(this).closest('tr').getCell(1).text(), 'data/file.html');
            break;
        }
      });
      // Finally, create the actual table
      $("#SMIContents").SmartTable({
        data_url: data_url, columns_url: configuration_url
      });
      $(this).trigger('smimain.contents.done', $(this).data());
    },
    editor: function(type, title, data_url) {
      $(this).trigger('smimain.load', 'editor');
      $(this).removeClass().addClass('SMIEditor');
      $(this).html('<div id="SMIInfo"></div><div id="SMIEditor"></div>');
      $("#SMIInfo").SMIInfo({
        mode: 'editor',
        type: type,
        title: title,
        data_url: data_url,
        tabs: {
          editor: (type == 'file') ? 'Contents' : null,
          contents: (type == 'folder') ? 'Contents' : null,
          properties: 'Properties',
          history: 'History',
          access: 'Access'
        },
        buttons: {
          preview: 'Preview',
          liveview: 'View on site'
        }
      });
      $("#SMIEditor").SMIEditor({
        data_url: data_url
      });
      $(this).trigger('smimain.editor.done', $(this).data());
    },
    properties: function(type, title, data_url) {
      $(this).trigger('smimain.load', 'properties');
      $(this).removeClass().addClass('SMIProperties');
      $(this).html('<div id="SMIInfo"></div><div id="SMIProperties"></div>');
      $("#SMIInfo").SMIInfo({
        mode: 'properties',
        type: type,
        title: title,
        data_url: data_url,
        tabs: {
          editor: (type == 'file') ? 'Contents' : null,
          contents: (type == 'folder') ? 'Contents' : null,
          properties: 'Properties',
          history: 'History',
          access: 'Access'
        },
        buttons: {
          liveview: 'View on site'
        }
      });
      $("#SMIProperties").SMIProperties(data_url);
      $(this).trigger('smimain.properties.done', $(this).data());
    },
    history: function(type, title, data_url) {
      $(this).trigger('smimain.load', 'history');
      $(this).removeClass().addClass('SMIHistory');
      $(this).html('<div id="SMIInfo"></div><div id="SMIHistory"></div>');
      $("#SMIInfo").SMIInfo({
        mode: 'history',
        type: type,
        title: title,
        data_url: data_url,
        tabs: {
          editor: (type == 'file') ? 'Contents' : null,
          contents: (type == 'folder') ? 'Contents' : null,
          properties: 'Properties',
          history: 'History',
          access: 'Access'
        },
        buttons: {
          liveview: 'View on site'
        }
      });
      $("#SMIHistory").SMIHistory(data_url);
      $(this).trigger('smimain.history.done', $(this).data());
    },
    access: function(type, title, data_url) {
      $(this).trigger('smimain.load', 'access');
      $(this).removeClass().addClass('SMIAccess');
      $(this).html('<div id="SMIInfo"></div><div id="SMIAccess"></div>');
      $("#SMIInfo").SMIInfo({
        mode: 'access',
        type: type,
        title: title,
        data_url: data_url,
        tabs: {
          editor: (type == 'file') ? 'Contents' : null,
          contents: (type == 'folder') ? 'Contents' : null,
          properties: 'Properties',
          history: 'History',
          access: 'Access'
        },
        buttons: {
          liveview: 'View on site'
        }
      });
      $("#SMIAccess").SMIAccess(data_url);
      $(this).trigger('smimain.access.done', $(this).data());
    }
  };

  $.fn.SMIMain = function(method) {
    if(methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      alert('Method ' + method + ' does not exist');
    }
  };
})(jQuery);
