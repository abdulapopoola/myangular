'use strict';

var Scope = require('../src/scope');
var _ = require('lodash');

describe('Scope', function () {
    it('can be constructed and used as an object', function () {
        var scope = new Scope();
        scope.aproperty = 1;

        expect(scope.aproperty).toBe(1);
    });

    describe('digest', function () {
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        it('calls the listener fxn of a watch on first $digest', function () {
            var watchFn = function () { return 'wat'; };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch fxn with the scope as the argument', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () { };
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener fxn when the watched value changes', function () {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch(
                function () { return scope.someValue; },
                function (newValue, oldValue, scope) { scope.counter++; }
            );

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', function () {
            scope.counter = 0;

            scope.$watch(
                function () { return scope.someValue; },
                function (newValue, oldValue, scope) { scope.counter++; }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listener with newValue as oldValue on 1st call', function () {
            scope.someValue = 123;
            var oldValueGiven;

            scope.$watch(
                function () { return scope.someValue; },
                function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('may have watchers that omit the listener fxn', function () {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);
            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        it('triggers chained watachers in the same digest', function () {
            scope.name = 'Jane';

            scope.$watch(
                function (scope) { return scope.nameUpper; },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );

            scope.$watch(
                function (scope) { return scope.name; },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();

            expect(scope.initial).toBe('B.');
        });

        it('gives up on the watches after 10 iterations', function () {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function (scope) { return scope.counterA; },
                function (newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );

            scope.$watch(
                function (scope) { return scope.counterB; },
                function (newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );

            expect((function () { scope.$digest(); })).toThrow();
        });

        it('ends the digest when the last watch is clean', function () {
            scope.array = _.range(100);
            var watchExecutions = 0;

            _.times(100, function (i) {
                scope.$watch(function () {
                    watchExecutions++;
                    return scope.array[i];
                }, function () { });
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();

            expect(watchExecutions).toBe(301);
        });

        it('does not end digest so that new watches are not run', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.$watch(
                        function (scope) { return scope.aValue; },
                        function (newValue, oldValue, scope) {
                            scope.counter++;
                        });
                });

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
    });
});
