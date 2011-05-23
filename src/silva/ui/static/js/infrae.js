

// Define level namespace.

(function (window) {
    var infrae = {};

    // Add a rescope method
    if (Function.prototype.scope === undefined) {
        Function.prototype.scope = function(scope) {
            var _function = this;

            return function() {
                return _function.apply(scope, arguments);
            };
        };
    };

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
        match: function(conditions, array) {
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
         * Helper that call a callback on each element of an array.
         * @param array: array containing elements.
         * @param callback: callback to call on each element of the array.
         */
        each: function(array, callback) {
            for (var index=0; index < array.length; index++) {
                callback(array[index]);
            };
        },
        apply_on_each: function(array, callback) {
            for (var index=0; index < array.length; index++) {
                callback.apply(array[index]);
            };
        },
        /**
         * Helper that call a callback on each element of an array,
         * and build a new one with the results of each call.
         * @param array: array containing elements.
         * @param callback: callback to call on each element of the array.
         */
        map: function(array, callback, result) {
            if (result == undefined) {
                result = [];
            };
            for (var index=0; index < array.length; index++) {
                result.push(callback(array[index]));
            };
            return result;
        },
        apply_on_map: function(array, callback, result) {
            if (result == undefined) {
                result = [];
            };
            for (var index=0; index < array.length; index++) {
                result.push(callback.apply(array[index]));
            };
            return result;
        }

    });

    infrae.utils = module;
})(infrae, jQuery);
