'use strict';

function $HttpProvider() {
    this.$get = ['$httpBackend', '$q', function ($httpBackend, $q) {
        return function $http(config) {
            var deferred = $q.defer();
            $httpBackend(config.method, config.url, config.data);
            return deferred.promise;
        };
    }];
}

module.exports = $HttpProvider;
