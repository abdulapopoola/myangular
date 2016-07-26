'use strict';

var _ = require('lodash');

function isSuccess(status) {
    return status >= 200 && status < 300;
}

function $HttpProvider() {
    var defaults = this.defaults = {
        headers: {
            common: {
                Accept: 'application/json, text/plain, */*'
            },
            post: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            put: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            patch: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        }
    };

    function mergeHeaders(config) {
        var reqHeaders = _.extend(
            {},
            config.headers
        );
        var defHeaders = _.extend(
            {},
            defaults.headers.common,
            defaults.headers[(config.method || 'get').toLowerCase()]
        );
        _.forEach(defHeaders, function (value, key) {
            var headerExists = _.some(reqHeaders, function (v, k) {
                return k.toLowerCase() === key.toLowerCase();
            });
            if (!headerExists) {
                reqHeaders[key] = value;
            }
        });
        return executeHeaderFns(reqHeaders, config);
    }

    function executeHeaderFns(headers, config) {
        return _.transform(headers, function (result, v, k) {
            if (_.isFunction(v)) {
                v = v(config);
                if (_.isNull(v) || _.isUndefined(v)) {
                    delete result[k];
                } else {
                    result[k] = v;
                }
            }
        }, headers);
    }

    this.$get = ['$httpBackend', '$q', '$rootScope',
        function ($httpBackend, $q, $rootScope) {
            function $http(requestConfig) {
                var deferred = $q.defer();

                var config = _.extend({
                    method: 'GET'
                }, requestConfig);
                config.headers = mergeHeaders(requestConfig);

                if (_.isUndefined(config.data)) {
                    _.forEach(config.headers, function (v, k) {
                        if (k.toLowerCase() === 'content-type') {
                            delete config.headers[k];
                        }
                    });
                }

                function done(status, response, statusText) {
                    status = Math.max(status, 0);
                    deferred[isSuccess(status) ? 'resolve' : 'reject']({
                        status: status,
                        data: response,
                        statusText: statusText,
                        config: config
                    });
                    if (!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }

                $httpBackend(config.method,
                    config.url,
                    config.data,
                    done,
                    config.headers);
                return deferred.promise;
            }
            $http.defaults = defaults;
            return $http;
        }];
}

module.exports = $HttpProvider;
