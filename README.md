# super-res

[![Travis build status](http://img.shields.io/travis/jbalboni/super-res.svg?style=flat)](https://travis-ci.org/jbalboni/super-res)
[![Test Coverage](https://codeclimate.com/github/jbalboni/super-res/badges/coverage.svg)](https://codeclimate.com/github/jbalboni/super-res)
[![Dependency Status](https://david-dm.org/jbalboni/super-res.svg)](https://david-dm.org/jbalboni/super-res)
[![devDependency Status](https://david-dm.org/jbalboni/super-res/dev-status.svg)](https://david-dm.org/jbalboni/super-res#info=devDependencies)

This is patterned off of Angular's $resource service, except that it does not depend on Angular and uses superagent instead of $http. Route parsing is done with the route-parser module.

    var superRes = require('super-res');

    var myResource = superRes.resource('/my-endpoint/:id')

    myResource.get({id: 1})
        .then(function (responseData) {
            console.log(responseData);
        });
    
    myResource.save({id: 1}, {content: 'some sort of content')
        .then(function (responseData) {
            console.log(responseData);
        });
    
The options and interface defined in the [$resource doc](https://docs.angularjs.org/api/ngResource/service/$resource) is accurate (aside from the missing features and differences mentioned later)
    
## Caching

Caching is handled by the [cache-manager](https://www.npmjs.com/package/cache-manager) node module. If you create an action with the cache option set to true, 
it will use cache-manager's default in-memory cache with a max size of 100 items and a max age of 20 minutes. Or, you can provide your own cache object, 
so long as it follows the cache-manager interface.

There is also a function called promiseWrapper, which will wrap the promises returned by each action with an instance of $q passed to it. This is helpful if you want to use it with Angular:

    angular.module('test', []).factory('myResource', function ($q) {
        var superRes = require('super-res');
        
        return superRes.promiseWrapper($q.when)(superRes.resource('/my-endpoint/:id'));
    });
    
    //somewhere else
    myResource.get({id: 1}; // returns a promise wrapped in $q.when() to hook into digest cycle

The api is generally the same, but some things are not yet implemented. Here's what's on the list to add:
- batching

Differences from angular-resource:
- Entirely promise based. No $promise or $resolved properties.
- The data returned is just an object, it does not have any resource functions attached.
- isArray doesn't do anything. I haven't seen a use case for it (arrays and objects work as you'd expect).
- Includes a default PUT action (called put).
- Transforms are passed a headers object as the second argument, rather than a getter.
- Superagent will automatically parse certain response types. This is not suppressed by passing a responseTransform of [].
