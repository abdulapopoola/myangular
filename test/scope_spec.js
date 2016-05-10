'use strict';

var Scope = require('../src/scope');

describe('Scope', function() {
    it('can be constructed and used as an object', function() {
        var scope = new Scope();
        scope.aproperty = 1;

        expect(scope.aproperty).toBe(1);
    });

    describe('digest', function() {
        var scope;

        beforeEach(function() {
            scope = new Scope();
        });

        it('calls the listener fxn of a watch on first $digest', function() {
            var watchFn = function() { return 'wat'; };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch fxn with the scope as the argument', function() {
            var watchFn = jasmine.createSpy();
            var listenerFn = function() {};
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });
    });
});
