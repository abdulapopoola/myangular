'use strict';

var setupModuleLoader = require('./loader');

function publishExternalAPI() {
    setupModuleLoader(window);

    var ngModule = window.angular.module('ng', []);
    ngModule.provider('$filter', require('./filter'));
}

module.exports = publishExternalAPI;
