

// Define level namespace.

(function (window) {
    var infrae = {};

    window.infrae = infrae;
})(window);


// Utils

(function (infrae, $) {
    var module = {};
    var predicates = {};

    $.extend(predicates, {
        or: function() {
            var max = arguments.length;
            var index = 1;

            while (index < max) {
                if (predicates[arguments[index][0]].apply(this, arguments[index]) === true) {
                    return true;
                };
                index += 1;
            };
            return false;
        },
        and: function() {
            var max = arguments.length;
            var index = 1;

            while (index < max) {
                if (predicates[arguments[index][0]].apply(this, arguments[index]) !== true) {
                    return false;
                };
                index += 1;
            };
            return true;
        },
        not: function() {
            return !predicates[arguments[1][0]].apply(this, arguments[1]);
        },
        equal: function() {
            var value = this[arguments[1]];
            var max = arguments.length;
            var index = 2;

            while (index < max) {
                if (arguments[index] == value) {
                    return true;
                };
                index += 1;
            };
            return false;
        },
        provides: function() {
            var max = arguments.length;
            var index = 1;

            while (index < max) {
                if (infrae.interfaces.is_implemented_by(arguments[index], this)) {
                    return true;
                };
                index += 1;
            };
            return false;
        }
    });

    $.extend(module, {
        /**
         * Helper that return true if one object in array match
         * all conditions.
         *
         * @param array: array of object with properties
         * @param conditions: object with properties that are list of
         *        possible values that a data object must have in order to
         *        match.
         */
        test: function(data, conditions) {
            return predicates[conditions[0]].apply(data, conditions);
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
        map_concat: function(array, callback, result) {
            var index, len;

            if (result === undefined) {
                result = [];
            };
            for (index=0, len=array.length; index < len; index++) {
                result = result.concat(callback(array[index]));
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
