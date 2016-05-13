'use strict';

var _ = require('lodash');

function initWatchVal() { }

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
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
    return function() {
        _.remove(that.$$watchers, watcher);    
    };
};

Scope.prototype.$digestOnce = function () {
    var that = this;
    var dirty;

    _.forEachRight(this.$$watchers, function (watcher) {
        try {
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

    do {
        dirty = this.$digestOnce();
        if (dirty && !(ttl--)) {
            throw '10 digest iterations reached';
        }
    } while (dirty);
};

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue;
    }
};

module.exports = Scope;
