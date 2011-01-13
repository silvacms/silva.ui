(function($) {
  /**
   * SMIMain editor screen
   *
   * Uses CKEditor for editing contents of a page or file.
   */
  $.fn.SMIEditor = function(method) {
    var $SMIEditor = this;
    var editor_config = {
      toolbar: [['Bold', 'Italic', '-', 'NumberedList', 'BulletedList', '-', 'Link', 'Unlink']],
      width: $('#SMIEditor').width(),
      height: $('#SMIEditor').height() - 57,
      resize_enabled: false,
      skin: 'smi'
    };
    var methods = {
      init: function(options) {
        $.get(options.data_url, function(data){
          $SMIEditor.html('<form><textarea name="editor" id="editor">'+data+'</textarea></form>');
          var instance = CKEDITOR.instances['editor'];
          if (instance) {
            CKEDITOR.remove(instance);
          }
          CKEDITOR.replace('editor', editor_config);
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