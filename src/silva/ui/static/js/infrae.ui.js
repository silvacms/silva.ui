
// UI

(function (infrae, $) {
    var module = {};

    $.extend(module, {
        /**
         * Render an icon, either from a sprite or a file.
         * @param $content: jQuery content on which the icon must be rendered.
         * @param icon: icon identifier.
         */
        icon: function($content, icon) {
            if (icon.indexOf('.') < 0) {
                $content.addClass(icon);
            } else {
                $content.attr(
                    'style',
                    'background:url(' + icon + ') no-repeat center center;');
            };
        }
    });

    infrae.ui = module;
})(infrae, jQuery);
