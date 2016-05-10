'use strict';

var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
}

Scope.prototype.$watch = function(watchFn, listenerFn) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn
    };
    this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function() {
    var that = this;
    _.forEach(this.$$watchers, function(watcher) {
        watcher.watchFn(that);
        watcher.listenerFn();
    });
};

module.exports = Scope;
