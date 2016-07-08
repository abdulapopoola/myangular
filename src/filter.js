'use strict';

var _ = require('lodash');

function $FilterProvider() {
    var filters = {};
    
    this.register = function (name, factory) {
        if (_.isObject(name)) {
            return _.map(name, _.bind(function (factory, name) {
                return this.register(name, factory);
            }, this));
        } else {
            var filter = factory();
            filters[name] = filter;
            return filter;
        }
    };

    this.$get = function () {
        return function filter(name) {
            return filters[name];
        };
    };

    this.register('filter', require('./filter_filter'));
}

module.exports = $FilterProvider;
