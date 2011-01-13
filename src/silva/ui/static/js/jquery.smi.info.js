(function($) {
  /**
   * SMIMain informational bar
   *
   * Shows title and other info and can contain buttons to perform actions on the screen below it.
   */
  $.fn.SMIInfo = function(method) {
    var $SMIInfo = this;
    var methods = {
      init: function(options) {
        $SMIInfo.html('<h3>'+options.title+'</h3>');
        $SMIInfo.append('<ol id="SMIInfo_tabs"></ol>');
        $SMIInfo.append('<ol id="SMIInfo_actions"></ol>');

        for(var tab in options.tabs){
          if (options.tabs[tab] == null) continue;
          var active = (tab == options.mode) ? ' class="active"' : '';
          $('#SMIInfo_tabs').append('<li><a rel="'+tab+'" href="#"'+active+'>'+options.tabs[tab]+'</a></li>');
        }
        for(var button in options.buttons){
          $('#SMIInfo_actions').append('<li><a rel="'+button+'" href="#">'+options.buttons[button]+'</a></li>');
        }
        $('#SMIInfo_tabs a').click(function(event){
          event.preventDefault();
          $("#contents").SMIMain($(this).attr('rel'), options.type, $SMIInfo.find('h3').html(), options.data_url);
        });
        if($('tr.selected').length > 0){
          alert('asd');
        }
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