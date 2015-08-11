(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('superagent'), require('route-parser'), require('q')) : typeof define === 'function' && define.amd ? define(['superagent', 'route-parser', 'q'], factory) : global.superRes = factory(global.request, global.Route, global.Q);
})(this, function (request, Route, Q) {
  'use strict';

  require('babel/polyfill');

  var super_res__superRes = {};

  var actionDefaults = {
    method: 'GET',
    responseType: 'json'
  };

  function buildRequest(action, route, params, data) {
    var currentRequest = request;

    var method = action.method.toLowerCase();
    currentRequest = request[method === 'delete' ? 'del' : method](route.reverse(params));

    currentRequest = currentRequest.accept(action.responseType);

    if (data && method === 'get') {
      currentRequest = currentRequest.query(data);
    } else if (data) {
      currentRequest = currentRequest.send(data);
    }

    return currentRequest;
  }

  function buildAction(url, action) {
    var fullAction = Object.assign({ url: url }, actionDefaults, action);
    var route = new Route(fullAction.url);
    return function (params, data) {
      var deferred = Q.defer();
      var timeoutId = undefined;
      if (action.timeout) {
        timeoutId = setTimeout(function () {
          deferred.reject({ reason: 'Timeout reached' });
        }, action.timeout);
      }
      buildRequest(fullAction, route, params, data).end(function (err, res) {
        clearTimeout(timeoutId);
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(res.body);
        }
      });
      return deferred.promise;
    };
  }

  function buildDefaultActions(url) {
    var resource = {};
    resource.get = buildAction(url, Object.assign({}, actionDefaults));
    resource.query = resource.get;
    resource.save = buildAction(url, Object.assign({}, actionDefaults, { method: 'POST' }));
    resource.put = buildAction(url, Object.assign({}, actionDefaults, { method: 'PUT' }));
    resource.remove = buildAction(url, Object.assign({}, actionDefaults, { method: 'DELETE' }));
    resource['delete'] = resource.remove;
    return resource;
  }

  super_res__superRes.resource = function (url, defaultParams, actions) {
    var resource = buildDefaultActions(url);
    if (actions) {
      Object.getOwnPropertyNames(actions).forEach(function (name) {
        resource[name] = buildAction(url, actions[name]);
      });
    }
    return resource;
  };

  super_res__superRes.proxyQ = function (qInstance) {
    return function (resource) {
      var proxiedResource = Object.assign({}, resource);
      Object.getOwnPropertyNames(resource).forEach(function (name) {
        var actionFunction = proxiedResource[name];
        proxiedResource[name] = function () {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var promise = actionFunction.apply(proxiedResource, args);
          return qInstance.when(promise);
        };
      });
      return proxiedResource;
    };
  };

  var super_res = super_res__superRes;

  return super_res;
});
//# sourceMappingURL=super-res.js.map