

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

    var last_non_null = function(values) {
        var value = null;
        var index = values.length;

        while (index--) {
            if (values[index]) {
                value = values[index];
                break;
            };
        };
        return value;
    };

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
                    var condition = conditions[property];
                    var value = object[property];

                    if ($.isArray(value)) {
                        value = last_non_null(value);
                    };
                    if ($.inArray(value, condition) < 0) {
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
            var index, len;

            for (index=0, len=array.length; index < len; index++) {
                callback(array[index]);
            };
        },
        apply_on_each: function(array, callback) {
            var index, len;

            for (index=0, len=array.length; index < len; index++) {
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
            var index, len;

            if (result === undefined) {
                result = [];
            };
            for (index=0, len=array.length; index < len; index++) {
                result.push(callback(array[index]));
            };
            return result;
        },
        lazy_map: function(array, callback, result) {
            var index = 0;
            var len = array.length;
            var deferred = $.Deferred();

            if (result === undefined) {
                result = [];
            };

            var work = function() {
                var start = +new Date();

                for (;index < len; index++) {
                    result.push(callback(array[index]));
                    if (+new Date() - start > 50) {
                        setTimeout(work, 50);
                        return;
                    };
                };
                deferred.resolve(result);
            };
            work();
            return deferred.promise();
        },
        apply_on_map: function(array, callback, result) {
            var index, len;

            if (result === undefined) {
                result = [];
            };
            for (index=0, len=array.length; index < len; index++) {
                result.push(callback.apply(array[index]));
            };
            return result;
        }

    });

    infrae.utils = module;
})(infrae, jQuery);

