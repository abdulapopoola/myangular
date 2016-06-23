'use strict';

function filterFilter() {
    return function (array, filterExpr) {
        var predicateFn;
        if (_.isFunction(filterExpr)) {
            predicateFn = filterExpr;
        } else if (_.isString(filterExpr) ||
            _.isNumber(filterExpr) ||
            _.isBoolean(filterExpr) ||
            _.isNull(filterExpr) ||
            _.isObject(filterExpr)) {
            predicateFn = createPredicateFn(filterExpr);
        } else {
            return array;
        }
        return _.filter(array, predicateFn);
    };
};

function createPredicateFn(expression) {
    function comparator(actual, expected) {
        if (_.isUndefined(actual)) {
            return false;
        }
        if (_.isNull(actual) || _.isNull(expected)) {
            return actual === expected;
        }
        actual = ('' + actual).toLowerCase();
        expected = ('' + expected).toLowerCase();
        return _.includes(actual, expected);
    }

    return function predicateFn(item) {
        return deepCompare(item, expression, comparator, true);
    };
}

function deepCompare(actual, expected, comparator, matchAnyProperty) {
    if (_.isString(expected) && _.startsWith(expected, '!')) {
        return !deepCompare(actual, expected.substring(1), comparator, matchAnyProperty);
    }
    if (_.isArray(actual)) {
        return _.some(actual, function (actualItem) {
            return deepCompare(actualItem, expected, comparator, matchAnyProperty);
        });
    }
    if (_.isObject(actual)) {
        if (_.isObject(expected)) {
            return _.every(
                _.toPlainObject(expected),
                function (expectedVal, expectedKey) {
                    if (_.isUndefined(expectedVal)) {
                        return true;
                    }
                    var isWildcard = (expectedKey === '$');
                    var actualVal = isWildcard ? actual : actual[expectedKey];
                    return deepCompare(actualVal, expectedVal, comparator, isWildcard);
                }
            );
        } else if (matchAnyProperty) {
            return _.some(actual, function (value) {
                return deepCompare(value, expected, comparator, matchAnyProperty);
            });
        } else {
            return comparator(actual, expected);
        }
    } else {
        return comparator(actual, expected);
    }
}

module.exports = filterFilter;
