'use strict';

var _ = require('lodash');

function initWatchVal() {}

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
}

Scope.prototype.$watch = function(watchFn, listenerFn) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        last: initWatchVal
    };
    this.$$watchers.push(watcher);
    this.$$lastDirtyWatch = null;
};

Scope.prototype.$digestOnce = function() {
    var that = this;
    var dirty;

    _.forEach(this.$$watchers, function(watcher) {
        var newValue = watcher.watchFn(that);
        var oldValue = watcher.last;
        if (newValue !== oldValue) {
            that.$$lastDirtyWatch = watcher;
            watcher.last = newValue;
            watcher.listenerFn(newValue,
                oldValue === initWatchVal ? newValue : oldValue,
                that);
            dirty = true;
        } else if (that.$$lastDirtyWatch === watcher) {
            return false;
        }
    });
    return dirty;
};

Scope.prototype.$digest = function() {
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

module.exports = Scope;
