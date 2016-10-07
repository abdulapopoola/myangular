'use strict';

var _ = require('lodash');

function $ControllerProvider() {
    var controllers = {};
    this.register = function (name, controller) {
        controllers[name] = controller;
    };

    this.$get = ['$injector', function ($injector) {
        return function (ctrl, locals) {
            if (_.isString(ctrl)) {
                ctrl = controllers[ctrl];
            }
            return $injector.instantiate(ctrl, locals);
        };
    }];
}
module.exports = $ControllerProvider;