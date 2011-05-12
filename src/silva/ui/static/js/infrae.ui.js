
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
        },
        selection: {
            /**
             * Disable text based selection.
             * @param $content: jQuery content on which the text selection must be disabled.
             */
            disable: function($content) {
                return $content.css({
                    '-moz-user-select': 'none',
                    '-webkit-user-select': 'none',
                    'user-select': 'none'
                }).bind('selectstart', function() {
                    return false;
                }).bind('mousedown', function() {
                    return false;
                });
            },
            /**
             * Enable previously disabled text selection.
             * @param $content: jQuery content on which the text selection must be reenabled.
             */
            enable: function($content) {
                return $content.css({
                    '-moz-user-select': 'text',
                    '-webkit-user-select': 'text',
                    'user-select': 'text'
                }).unbind('selectstart').unbind('mousedown');
            }
        }
    });

    infrae.ui = module;
})(infrae, jQuery);
