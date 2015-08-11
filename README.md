# super-res

[![Travis build status](http://img.shields.io/travis/jbalboni/super-res.svg?style=flat)](https://travis-ci.org/jbalboni/super-res)
[![Code Climate](https://codeclimate.com/github/jbalboni/super-res/badges/gpa.svg)](https://codeclimate.com/github/jbalboni/super-res)
[![Test Coverage](https://codeclimate.com/github/jbalboni/super-res/badges/coverage.svg)](https://codeclimate.com/github/jbalboni/super-res)
[![Dependency Status](https://david-dm.org/jbalboni/super-res.svg)](https://david-dm.org/jbalboni/super-res)
[![devDependency Status](https://david-dm.org/jbalboni/super-res/dev-status.svg)](https://david-dm.org/jbalboni/super-res#info=devDependencies)

This is patterned off of Angular's $resource service, except that it does not depend on Angular and uses superagent instead of $http. Route parsing is done with the route-parser module.

    var superRes = require('super-res');

    var myResource = superRes.resource('/my-endpoint/:id')

    myResource.get({id: 1});
    
There is also a function called proxyQ, which will wrap the promises returned by each action with an instance of $q passed to it. This is helpful if you want to use with Angular:

    angular.module('test', []).factory('myResource', function ($q) {
        var superRes = require('super-res');
        
        return superRes.proxyQ($q)(superRes.resource('/my-endpoint/:id'));
    });
    
    //somewhere else
    myResource.get({id: 1}; // returns a promise wrapped in $q.when() to hook into digest cycle

The api is generally the same, but some things are not yet implemented. Here's what's on the list to add:
- transforms
- passing http headers
- caching
- withCredentials
- stripTrailingSlashes
- tests
- batching

Differences from angular-resource:
- Entirely promise based. No more $promise properties
- Default params object does not support functions or @ notation
- The data returned is just an object, it does not have any resource funtions attached
- isArray doesn't do anything. I haven't seen a use case for it (arrays and objects work as you'd expect)
- Includes a default PUT action (called put)
