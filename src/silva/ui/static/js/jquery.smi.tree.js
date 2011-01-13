(function($) {
  /**
   * Folder navigation tree using JSTree plugin.
   */
  $.fn.SMITree = function(json_url) {
    var $SMITree = this;
    var anim_time = 100; // JSTree open/close animation time in ms
    var indent_size = 21; // Width in px of a node level, for autoScroll

    /**
     * Scroll the tree container horizontally to allow for unlimited node depth.
     */
    $.fn.autoScroll = function(depth) {
      return this.each(function() {
        if(depth < 0) {
          depth = 0;
        }
        $('#SMITree').scrollLeft(indent_size * depth);
      });
    };

    // Load tree from JSON and set autoScroll triggers
    $SMITree.html('<h2>Structure</h2><div id="SMITree"></div>')
    .find('#SMITree').bind("open_node.jstree", function(e,data) {
      $(this).autoScroll(data.rslt.obj.parents('ul').length - 2);
    }).bind("close_node.jstree", function(e,data) {
      $(this).autoScroll(data.rslt.obj.parents('ul').length - 3);
    }).jstree({
      core: {
        animation: anim_time
      },
      plugins: ["json_data"],
      "json_data": {
        "ajax": {
          "url": json_url
        }
      }
    });

    // Open folders in SMIContents view
    $('#SMITree a').live('click', function(event){
      event.preventDefault();
      var titlehtml = $(this).clone(false).find('ins').removeClass('jstree-icon').addClass('icon').parent().html();
      $("#contents").SMIMain('contents', 'folder', $.trim(titlehtml), 'data/files.json');
    });
  };
})(jQuery);