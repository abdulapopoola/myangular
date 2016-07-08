'use strict';

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('filter', function () {
    beforeEach(function () {
        publishExternalAPI();
    });

    it('can be registered and obtained', function () {
        var myFilter = function () { };
        var myFilterFactory = function () {
            return myFilter;
        };
        var injector = createInjector(['ng', function ($filterProvider) {
            $filterProvider.register('my', myFilterFactory);
        }]);
        var $filter = injector.get('$filter');
        expect($filter('my')).toBe(myFilter);
    });

    it('allows registering multiple filters with an object', function () {
        var myFilter = function () { };
        var myOtherFilter = function () { };
        var injector = createInjector(['ng', function ($filterProvider) {
            $filterProvider.register({
                my: function () {
                    return myFilter;
                },
                myOther: function () {
                    return myOtherFilter;
                }
            });
        }]);
        
        var $filter = injector.get('$filter');
        expect($filter('my')).toBe(myFilter);
        expect($filter('myOther')).toBe(myOtherFilter);
    });
});
