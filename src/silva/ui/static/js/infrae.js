

// Define level namespace.

(function (window){
    var infrae = {};

    window.infrae = infrae;
})(window);


// Utils

(function (infrae, $) {
    var module = {};

    $.extend(module, {
        /**
         * Helper that return true if one object in array match all conditions.
         * @param array: array of object with properties
         * @param conditions: object with properties that are list of
         *        possible values that a data object must have in order to
         *        match.
         */
        match: function(array, conditions) {
            var index = array.length;

            while (index--) {
                var object = array[index];
                var missing = false;

                for (var property in conditions) {
                    if ($.inArray(object[property], conditions[property]) < 0) {
                        missing = true;
                        break;
                    };
                };
                if (!missing) {
                    return true;
                };
            };
            return false;
        },
        /**
         * Helper that call a callaback on each element of an array.
         * @param array: array containing elements.
         * @param callback: callback to call on each element of the array.
         */
        map: function(array, callback) {
            var index = array.length;

            while(index--) {
                callback(array[index]);
            };
        }
    });

    infrae.utils = module;
})(infrae, jQuery);

