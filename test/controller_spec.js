'use strict';

var $ = require('jquery');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
    }]);
}

describe('$controller', function () {
    beforeEach(function () {
        delete window.angular;
        publishExternalAPI();
    });

    it('instantiates controller functions', function () {
        var injector = createInjector(['ng']);
        var $controller = injector.get('$controller');
        function MyController() {
            this.invoked = true;
        }
        var controller = $controller(MyController);
        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
        expect(controller.invoked).toBe(true);
    });

    it('injects dependencies to controller functions', function () {
        var injector = createInjector(['ng', function ($provide) {
            $provide.constant('aDep', 42);
        }]);
        var $controller = injector.get('$controller');
        function MyController(aDep) {
            this.theDep = aDep;
        }
        var controller = $controller(MyController);
        expect(controller.theDep).toBe(42);
    });

    it('allows injecting locals to controller functions', function () {
        var injector = createInjector(['ng']);
        var $controller = injector.get('$controller');
        function MyController(aDep) {
            this.theDep = aDep;
        }
        var controller = $controller(MyController, { aDep: 42 });
        expect(controller.theDep).toBe(42);
    });

    it('allows registering controllers at config time', function () {
        function MyController() {
        }
        var injector = createInjector(['ng', function ($controllerProvider) {
            $controllerProvider.register('MyController', MyController);
        }]);
        var $controller = injector.get('$controller');
        var controller = $controller('MyController');
        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
    });

    it('allows registering several controllers in an object', function () {
        function MyController() { }
        function MyOtherController() { }
        var injector = createInjector(['ng', function ($controllerProvider) {
            $controllerProvider.register({
                MyController: MyController,
                MyOtherController: MyOtherController
            });
        }]);
        var $controller = injector.get('$controller');
        var controller = $controller('MyController');
        var otherController = $controller('MyOtherController');
        expect(controller instanceof MyController).toBe(true);
        expect(otherController instanceof MyOtherController).toBe(true);
    });

    it('allows registering controllers through modules', function () {
        var module = window.angular.module('myModule', []);
        module.controller('MyController', function MyController() { });
        var injector = createInjector(['ng', 'myModule']);
        var $controller = injector.get('$controller');
        var controller = $controller('MyController');
        expect(controller).toBeDefined();
    });

    it('does not normally look controllers up from window', function () {
        window.MyController = function MyController() { };
        var injector = createInjector(['ng']);
        var $controller = injector.get('$controller');
        expect(function () {
            $controller('MyController');
        }).toThrow();
    });

    it('looks up controllers from window when so configured', function () {
        window.MyController = function MyController() { };
        var injector = createInjector(['ng', function ($controllerProvider) {
            $controllerProvider.allowGlobals();
        }]);
        var $controller = injector.get('$controller');
        var controller = $controller('MyController');
        expect(controller).toBeDefined();
        expect(controller instanceof window.MyController).toBe(true);
    });

    describe('controllers', function () {
        it('can be attached to directives as functions', function () {
            var controllerInvoked;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    controller: function MyController() {
                        controllerInvoked = true;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('can be attached to directives as string references', function () {
            var controllerInvoked;
            function MyController() {
                controllerInvoked = true;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return { controller: 'MyController' };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('can be applied in the same element independent of each other', function () {
            var controllerInvoked;
            var otherControllerInvoked;
            function MyController() {
                controllerInvoked = true;
            }
            function MyOtherController() {
                otherControllerInvoked = true;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $controllerProvider.register('MyOtherController', MyOtherController);
                    $compileProvider.directive('myDirective', function () {
                        return { controller: 'MyController' };
                    });
                    $compileProvider.directive('myOtherDirective', function () {
                        return { controller: 'MyOtherController' };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
                expect(otherControllerInvoked).toBe(true);
            });
        });

        it('can be applied to different directives, as different instances', function () {
            var invocations = 0;
            function MyController() {
                invocations++;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return { controller: 'MyController' };
                    });
                    $compileProvider.directive('myOtherDirective', function () {
                        return { controller: 'MyController' };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(invocations).toBe(2);
            });
        });

        it('can be aliased with @ when given in directive attribute', function () {
            var controllerInvoked;
            function MyController() {
                controllerInvoked = true;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return { controller: '@' };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive="MyController"></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('gets scope, element, and attrs through DI', function () {
            var gotScope, gotElement, gotAttrs;
            function MyController($element, $scope, $attrs) {
                gotElement = $element;
                gotScope = $scope;
                gotAttrs = $attrs;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return { controller: 'MyController' };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive an-attr="abc"></div>');
                $compile(el)($rootScope);
                expect(gotElement[0]).toBe(el[0]);
                expect(gotScope).toBe($rootScope);
                expect(gotAttrs).toBeDefined();
                expect(gotAttrs.anAttr).toEqual('abc');
            });
        });

        it('can be attached on the scope', function () {
            function MyController() { }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {
                            controller: 'MyController',
                            controllerAs: 'myCtrl'
                        };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect($rootScope.myCtrl).toBeDefined();
                expect($rootScope.myCtrl instanceof MyController).toBe(true);
            });
        });

        it('gets isolate scope as injected $scope', function () {
            var gotScope;
            function MyController($scope) {
                gotScope = $scope;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {
                            scope: {},
                            controller: 'MyController'
                        };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(gotScope).not.toBe($rootScope);
            });
        });

        it('has isolate scope bindings available during construction', function () {
            var gotMyAttr;
            function MyController($scope) {
                gotMyAttr = $scope.myAttr;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {
                            scope: {
                                myAttr: '@myDirective'
                            },
                            controller: 'MyController'
                        };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can bind isolate scope bindings directly to self', function () {
            var gotMyAttr;
            function MyController() {
                gotMyAttr = this.myAttr;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {
                            scope: {
                                myAttr: '@myDirective'
                            },
                            controller: 'MyController',
                            bindToController: true
                        };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can return a semi-constructed controller', function () {
            var injector = createInjector(['ng']);
            var $controller = injector.get('$controller');
            function MyController() {
                this.constructed = true;
                this.myAttrWhenConstructed = this.myAttr;
            }
            var controller = $controller(MyController, null, true);
            expect(controller.constructed).toBeUndefined();
            expect(controller.instance).toBeDefined();
            controller.instance.myAttr = 42;
            var actualController = controller();
            expect(actualController.constructed).toBeDefined();
            expect(actualController.myAttrWhenConstructed).toBe(42);
        });

        it('can return a semi-constructed ctrl when using array injection', function () {
            var injector = createInjector(['ng', function ($provide) {
                $provide.constant('aDep', 42);
            }]);
            var $controller = injector.get('$controller');
            function MyController(aDep) {
                this.aDep = aDep;
                this.constructed = true;
            }
            var controller = $controller(['aDep', MyController], null, true);
            expect(controller.constructed).toBeUndefined();
            var actualController = controller();
            expect(actualController.constructed).toBeDefined();
            expect(actualController.aDep).toBe(42);
        });

        it('can bind semi-constructed controller to scope', function () {
            var injector = createInjector(['ng']);
            var $controller = injector.get('$controller');
            function MyController() {
            }
            var scope = {};
            var controller = $controller(MyController, { $scope: scope }, true, 'myCtrl');
            expect(scope.myCtrl).toBe(controller.instance);
        });

        it('can bind iso scope bindings through bindToController', function () {
            var gotMyAttr;
            function MyController() {
                gotMyAttr = this.myAttr;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {
                            scope: {},
                            controller: 'MyController',
                            bindToController: {
                                myAttr: '@myDirective'
                            }
                        };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can bind through bindToController without iso scope', function () {
            var gotMyAttr;
            function MyController() {
                gotMyAttr = this.myAttr;
            }
            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {
                            scope: true,
                            controller: 'MyController',
                            bindToController: {
                                myAttr: '@myDirective'
                            }
                        };
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can be required from a sibling directive', function () {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: {},
                        controller: MyController
                    };
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {
                        require: 'myDirective',
                        link: function (scope, element, attrs, myController) {
                            gotMyController = myController;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('can be required from multiple sibling directives', function () {
            function MyController() { }
            function MyOtherController() { }
            var gotControllers;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: true,
                        controller: MyController
                    };
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {
                        scope: true,
                        controller: MyOtherController
                    };
                });
                $compileProvider.directive('myThirdDirective', function () {
                    return {
                        require: ['myDirective', 'myOtherDirective'],
                        link: function (scope, element, attrs, controllers) {
                            gotControllers = controllers;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive my-third-directive></div>');
                $compile(el)($rootScope);
                expect(gotControllers).toBeDefined();
                expect(gotControllers.length).toBe(2);
                expect(gotControllers[0] instanceof MyController).toBe(true);
                expect(gotControllers[1] instanceof MyOtherController).toBe(true);
            });
        });

        it('can be required as an object', function () {
            function MyController() { }
            function MyOtherController() { }
            var gotControllers;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: true,
                        controller: MyController
                    };
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {
                        scope: true,
                        controller: MyOtherController
                    };
                });
                $compileProvider.directive('myThirdDirective', function () {
                    return {
                        require: {
                            myDirective: 'myDirective',
                            myOtherDirective: 'myOtherDirective'
                        },
                        link: function (scope, element, attrs, controllers) {
                            gotControllers = controllers;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive my-third-directive></div>');
                $compile(el)($rootScope);
                expect(gotControllers).toBeDefined();
                expect(gotControllers.myDirective instanceof MyController).toBe(true);
                expect(gotControllers.myOtherDirective instanceof MyOtherController)
                    .toBe(true);
            });
        });

        it('can be required as an object with values omitted', function () {
            function MyController() { }
            var gotControllers;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: true,
                        controller: MyController
                    };
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {
                        require: {
                            myDirective: '',
                        },
                        link: function (scope, element, attrs, controllers) {
                            gotControllers = controllers;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive my-third-directive></div>');
                $compile(el)($rootScope);
                expect(gotControllers).toBeDefined();
                expect(gotControllers.myDirective instanceof MyController).toBe(true);
            });
        });

        it('requires itself if there is no explicit require', function () {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: {},
                        controller: MyController,
                        link: function (scope, element, attrs, myController) {
                            gotMyController = myController;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('is passed through grouped link wrapper', function () {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        multiElement: true,
                        scope: {},
                        controller: MyController,
                        link: function (scope, element, attrs, myController) {
                            gotMyController = myController;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive-start></div><div my-directive-end></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('can be required from a parent directive', function () {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: {},
                        controller: MyController
                    };
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {
                        require: '^myDirective',
                        link: function (scope, element, attrs, myController) {
                            gotMyController = myController;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive><div my-other-directive></div></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('finds from sibling directive when requiring with parent prefix', function () {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng', function ($compileProvider) {
                $compileProvider.directive('myDirective', function () {
                    return {
                        scope: {},
                        controller: MyController
                    };
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {
                        require: '^myDirective',
                        link: function (scope, element, attrs, myController) {
                            gotMyController = myController;
                        }
                    };
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });
    });
});