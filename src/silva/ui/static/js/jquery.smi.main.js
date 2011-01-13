(function($) {
  /**
   * Main SMI screen, with several possible subscreens
   *
   * contents: Table of folder/publication contents
   * editor: CKEditor for editing/creating a page/document
   * properties: Form for changing properties such as metadata
   * history: Table of publication history
   */
  $.fn.SMIMain = function(method) {
    var $SMIMain = this;
    var methods = {
      init: function(data_url) { // Load root
        $SMIMain.SMIMain('contents', 'folder', '<ins class="icon silvalogo"></ins>Infrae', data_url);
      },
      contents: function(type, title, data_url) {
        $SMIMain.removeClass().addClass('SMIContents');
        $SMIMain.html('<div id="SMIInfo"></div><div id="SMIContents"></div>');
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
        $("#SMIContents").SMIContents({
          data_url: data_url
        });
      },
      editor: function(type, title, data_url) {
        $SMIMain.removeClass().addClass('SMIEditor');
        $SMIMain.html('<div id="SMIInfo"></div><div id="SMIEditor"></div>');
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
      },
      properties: function(type, title, data_url) {
        $SMIMain.removeClass().addClass('SMIProperties');
        $SMIMain.html('<div id="SMIInfo"></div><div id="SMIProperties"></div>');
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
      },
      history: function(type, title, data_url) {
        $SMIMain.removeClass().addClass('SMIHistory');
        $SMIMain.html('<div id="SMIInfo"></div><div id="SMIHistory"></div>');
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
      },
      access: function(type, title, data_url) {
        $SMIMain.removeClass().addClass('SMIAccess');
        $SMIMain.html('<div id="SMIInfo"></div><div id="SMIAccess"></div>');
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