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
    this.$$lastDirtyWatch = null;

    var that = this;
    return function () {
        that.$$lastDirtyWatch = null;
        _.remove(that.$$watchers, watcher);
    };
};

Scope.prototype.$digestOnce = function () {
    var that = this;
    var dirty;

    _.forEachRight(this.$$watchers, function (watcher) {
        try {
            if (watcher) {
                var newValue = watcher.watchFn(that);
                var oldValue = watcher.last;
                if (!that.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                    that.$$lastDirtyWatch = watcher;
                    watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                    watcher.listenerFn(newValue,
                        oldValue === initWatchVal ? newValue : oldValue,
                        that);
                    dirty = true;
                } else if (that.$$lastDirtyWatch === watcher) {
                    return false;
                }
            }
        } catch (e) {
            console.log(e);
        }
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    var ttl = 10;
    var dirty;
    this.$$lastDirtyWatch = null;
    this.$beginPhase(DIGEST_PHASE);

    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$asyncQueue.length) {
            var asyncTask = this.$$asyncQueue.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }
        dirty = this.$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
            throw '10 digest iterations reached';
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        this.$$postDigestQueue.shift()();
    }
};

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue;
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
        this.$digest();
    }
};

Scope.prototype.$evalAsync = function (expr) {
    var that = this;

    if (!this.$$phase && !this.$$asyncQueue.length) {
        setTimeout(function () {
            if (that.$$asyncQueue.length) {
                that.$digest();
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

    if (this.$$applyAsyncId == null) {
        this.$$applyAsyncId = setTimeout(function () {
            that.$apply(_.bind(that.$$flushApplyAsync, that));
        }, 0);
    }
};

Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        this.$$applyAsyncQueue.shift()();
    }
    this.$$applyAsyncId = null;
};

Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};

module.exports = Scope;
