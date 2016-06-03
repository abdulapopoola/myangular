'use strict';

var _ = require('lodash');

var DIGEST_PHASE = '$digest';
var APPLY_PHASE = '$apply';

function initWatchVal() { }

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$root = this;
    this.$$children = [];
    this.$$phase = null;
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function () { },
        valueEq: !!valueEq,
        last: initWatchVal
    };
    this.$$watchers.unshift(watcher);
    this.$root.$$lastDirtyWatch = null;

    var that = this;
    return function () {
        that.$root.$$lastDirtyWatch = null;
        _.remove(that.$$watchers, watcher);
    };
};

Scope.prototype.$digestOnce = function () {
    var that = this;
    var dirty;
    var continueLoop = true;

    this.$$everyScope(function (scope) {
        var newValue, oldValue;
        _.forEachRight(scope.$$watchers, function (watcher) {
            try {
                if (watcher) {
                    newValue = watcher.watchFn(scope);
                    oldValue = watcher.last;
                    if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                        that.$root.$$lastDirtyWatch = watcher;
                        watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                        watcher.listenerFn(newValue,
                            oldValue === initWatchVal ? newValue : oldValue,
                            scope);
                        dirty = true;
                    } else if (that.$root.$$lastDirtyWatch === watcher) {
                        continueLoop = false;
                        return false;
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });
        return continueLoop;
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    var ttl = 10;
    var dirty;
    this.$root.$$lastDirtyWatch = null;
    this.$beginPhase(DIGEST_PHASE);

    if (this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (e) {
                console.error(e);
            }
        }
        dirty = this.$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
            throw '10 digest iterations reached';
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } catch (e) {
            console.error(e);
        }
    }
};

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue ||
            (typeof newValue === 'number' &&
                typeof oldValue === 'number' &&
                isNaN(newValue) &&
                isNaN(oldValue));
    }
};

Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$apply = function (fn) {
    try {
        this.$beginPhase(APPLY_PHASE);
        return this.$eval(fn);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};

Scope.prototype.$evalAsync = function (expr) {
    var that = this;

    if (!this.$$phase && !this.$$asyncQueue.length) {
        setTimeout(function () {
            if (that.$$asyncQueue.length) {
                that.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({
        scope: this,
        expression: expr
    });
};

Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress';
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};

Scope.prototype.$applyAsync = function (expr) {
    var that = this;
    this.$$applyAsyncQueue.push(function () {
        that.$eval(expr);
    });

    if (this.$root.$$applyAsyncId == null) {
        this.$root.$$applyAsyncId = setTimeout(function () {
            that.$apply(_.bind(that.$$flushApplyAsync, that));
        }, 0);
    }
};

Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } catch (e) {
            console.error(e);
        }
    }
    this.$root.$$applyAsyncId = null;
};

Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};

Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
    var that = this;
    var newValues = new Array(watchFns.length);
    var oldValues = new Array(watchFns.length);
    var changeReactionScheduled = false;
    var firstRun = true;

    if (_.isEmpty(watchFns)) {
        var shouldCall = true;
        this.$evalAsync(function () {
            if (shouldCall) {
                listenerFn(newValues, oldValues, that);
            }
        });
        return function () {
            shouldCall = false;
        };
    }

    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, oldValues, that);
        } else {
            listenerFn(newValues, oldValues, that);
        }
        changeReactionScheduled = false;
    }

    var destroyFunctions = _.map(watchFns, function (watchFn, i) {
        return that.$watch(watchFn, function (newValue, oldValue) {
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
                changeReactionScheduled = true;
                that.$evalAsync(watchGroupListener);
            }
        });
    });

    return function () {
        _.forEach(destroyFunctions, function (destroyFn) {
            destroyFn();
        });
    };
};

Scope.prototype.$new = function (isolated, parent) {
    var child;
    parent = parent || this;
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function () { };
        ChildScope.prototype = this;
        child = new ChildScope();
    }
    parent.$$children.push(child);
    child.$$watchers = [];
    child.$$children = [];
    child.$parent = parent;
    return child;
};

Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};

Scope.prototype.$destroy = function () {
    var siblings = this.$parent && this.$parent.$$children;
    _.remove(siblings, this);
    this.$$watchers = null;
};

Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
    var that = this;
    var newValue;
    var oldValue;
    var oldLength;
    var changeCount = 0;

    var internalWatchFn = function (scope) {
        var newLength;
        newValue = watchFn(scope);

        if (_.isObject(newValue)) {
            if (isArrayLike(newValue)) {
                if (!_.isArray(oldValue)) {
                    changeCount++;
                    oldValue = [];
                }
                if (newValue.length !== oldValue.length) {
                    changeCount++;
                    oldValue.length = newValue.length;
                }
                _.forEach(newValue, function (newItem, i) {
                    var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
                    if (!bothNaN && newItem !== oldValue[i]) {
                        changeCount++;
                        oldValue[i] = newItem;
                    }
                });
            } else {
                if (!_.isObject(oldValue) || isArrayLike(oldValue)) {
                    changeCount++;
                    oldValue = {};
                    oldLength = 0;
                }
                newLength = 0;
                _.forOwn(newValue, function (newVal, key) {
                    newLength++;
                    if (oldValue.hasOwnProperty(key)) {
                        var bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
                        if (!bothNaN && oldValue[key] !== newVal) {
                            changeCount++;
                            oldValue[key] = newVal;
                        }
                    } else {
                        changeCount++;
                        oldLength++;
                        oldValue[key] = newVal;
                    }
                });
                if (oldLength > newLength) {
                    _.forOwn(oldValue, function (oldVal, key) {
                        if (!newValue.hasOwnProperty(key)) {
                            changeCount++;
                            oldLength--;
                            delete oldValue[key];
                        }
                    });
                }
            }
        } else {
            if (!that.$$areEqual(newValue, oldValue, false)) {
                changeCount++;
            }

            oldValue = newValue;
        }
        return changeCount;
    };

    var internalListenerFn = function (scope) {
        listenerFn(newValue, oldValue, that);
    };

    return this.$watch(internalWatchFn, internalListenerFn);
};

function isArrayLike(obj) {
    if (_.isNull(obj) || _.isUndefined(obj)) {
        return false;
    }
    
    //better approach - phantomJS blows up though
    //return obj[Symbol.iterator] === [][Symbol.iterator];
    var length = obj.length;

    return length === 0 ||
        (_.isNumber(length) && length > 0 && (length - 1) in obj);
}

module.exports = Scope;
