(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('q'), require('superagent'), require('route-parser'), require('cache-manager')) : typeof define === 'function' && define.amd ? define(['q', 'superagent', 'route-parser', 'cache-manager'], factory) : global.superRes = factory(global.Q, global.superagent, global.Route, global.cacheManager);
})(this, function (Q, superagent, Route, cacheManager) {
  'use strict';

  'use strict';

  var superagentAdapter__exports = {};

  superagentAdapter__exports.configureRequest = function configureRequest(config, url, dataTransformer) {
    var method = config.method.toLowerCase();
    var currentRequest = superagent[method === 'delete' ? 'del' : method](url);

    currentRequest = currentRequest.accept(config.responseType);
    if (config.headers) {
      currentRequest = currentRequest.set(config.headers);
    }

    if (config.timeout) {
      currentRequest.timeout(config.timeout);
    } else {
      currentRequest.clearTimeout();
    }

    if (config.withCredentials) {
      currentRequest = currentRequest.withCredentials();
    }

    var transformedData = dataTransformer(currentRequest.header);
    if (transformedData) {
      if (method === 'get') {
        currentRequest = currentRequest.query(transformedData);
      } else {
        currentRequest = currentRequest.send(transformedData);
      }
    }

    return currentRequest;
  };

  superagentAdapter__exports.makeRequest = function makeRequest(request) {
    var deferred = Q.defer();
    request.end(function (err, res) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(res);
      }
    });
    return deferred.promise;
  };

  var superagentAdapter = superagentAdapter__exports;

  var actionDefaults = actionDefaults = {
    method: 'GET',
    responseType: 'json',
    transformRequest: [],
    transformResponse: [],
    withCredentials: false,
    cache: null
  };

  var createRequestor_js__assign = createRequestor_js__assign || require('object.assign');

  var cacheDefault = { store: 'memory', max: 100, ttl: 1200 };

  function createResponseTransformer(transforms) {
    return function applyResponseTransforms(response) {
      return Q.resolve(transforms.reduce(function (memo, transform) {
        return transform(memo, response.header);
      }, response.body));
    };
  }

  function applyRequestTransforms(transforms, header, data) {
    return transforms.reduce(function (memo, transform) {
      return transform(memo, header);
    }, data);
  }

  function canHaveData(method) {
    var methodUpper = method.toUpperCase();
    return methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'PATCH';
  }

  function getParameters(defaultParamConfig) {
    return Object.getOwnPropertyNames(defaultParamConfig).reduce(function (params, paramName) {
      var param = defaultParamConfig[paramName];
      if (typeof param === 'function') {
        params.derivedParams[paramName] = param;
      } else if (typeof param === 'string' && param.startsWith('@')) {
        params.derivedParams[paramName] = param.slice(1);
      } else {
        //add to default if it's not an @ or function param
        params.defaultParams[paramName] = param;
      }
      return params;
    }, { derivedParams: {}, defaultParams: {} });
  }

  function createCacheKeyGetter(route) {
    return function getCacheKey(params, data) {
      return route.reverse(params) + JSON.stringify(data || {});
    };
  }

  function checkCache(method, cache, key) {
    var deferred = Q.defer();
    if (cache && method.toUpperCase() === 'GET') {
      cache.get(key, function (err, result) {
        if (err) {
          deferred.reject(err);
        } else if (result) {
          deferred.resolve({ found: true, result: result });
        } else {
          deferred.resolve({ found: false });
        }
      });
    } else {
      deferred.resolve({ found: false });
    }
    return deferred.promise;
  }

  function expandParams(derivedParams, defaultParams, data) {
    return Object.getOwnPropertyNames(derivedParams).reduce(function (computedParams, prop) {
      var param = derivedParams[prop];
      if (typeof param === 'function') {
        computedParams[prop] = param();
      } else {
        computedParams[prop] = data[param];
      }
      return computedParams;
    }, createRequestor_js__assign({}, defaultParams));
  }

  function createRequestTransformer(transform, data) {
    return function (header) {
      return data ? applyRequestTransforms(transform, header, data) : null;
    };
  }

  function createRequestor(url, defaultParamConfig, action) {
    var config = createRequestor_js__assign({ url: url }, actionDefaults, action);
    //const canHaveData = canHaveData(config.method);
    var route = new Route(config.url);

    var _getParameters = getParameters(defaultParamConfig || {});

    var derivedParams = _getParameters.derivedParams;
    var defaultParams = _getParameters.defaultParams;

    var transformResponse = createResponseTransformer(config.transformResponse);
    var getCacheKey = createCacheKeyGetter(route);

    config.cache = config.cache === true ? cacheManager.caching(cacheDefault) : config.cache;

    return function (params, data) {
      if (arguments.length === 1 && canHaveData(config.method)) {
        data = params;
        params = undefined;
      }
      var fullParams = createRequestor_js__assign(expandParams(derivedParams, defaultParams, data), params);
      var url = route.reverse(params);
      var configuredHttpRequest = superagentAdapter.configureRequest(config, url, createRequestTransformer(config.transformRequest, data));
      var cacheKey = getCacheKey(fullParams, data);
      return checkCache(config.method, config.cache, cacheKey).then(function cacheSuccess(_ref) {
        var found = _ref.found;
        var result = _ref.result;

        if (found) {
          return Q.resolve(result);
        } else {
          return superagentAdapter.makeRequest(configuredHttpRequest).then(transformResponse).then(function cacheResponse(response) {
            if (config.cache) {
              config.cache.set(cacheKey, response);
            }
            return Q.resolve(response);
          });
        }
      });
    };
  }

  var super_res__assign = super_res__assign || require('object.assign');

  var superRes = {};

  function generateDefaultActions(url, defaultParams) {
    var resource = {};

    resource.get = createRequestor(url, defaultParams);
    resource.query = resource.get;
    resource.save = createRequestor(url, defaultParams, { method: 'POST' });
    resource.put = createRequestor(url, defaultParams, { method: 'PUT' });
    resource.remove = createRequestor(url, defaultParams, { method: 'DELETE' });
    resource['delete'] = resource.remove;

    return resource;
  }

  superRes.resource = function (url, defaultParams, actions) {
    var resource = generateDefaultActions(url, defaultParams);
    if (actions) {
      Object.getOwnPropertyNames(actions).forEach(function (name) {
        resource[name] = createRequestor(url, defaultParams, actions[name]);
      });
    }
    return resource;
  };

  superRes.promiseWrapper = function promiseWrapper(wrapperFunc) {
    return function (resource) {
      var proxiedResource = super_res__assign({}, resource);
      Object.getOwnPropertyNames(resource).forEach(function (name) {
        var actionFunction = proxiedResource[name];
        proxiedResource[name] = function () {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var promise = actionFunction.apply(proxiedResource, args);
          return wrapperFunc(promise);
        };
      });
      return proxiedResource;
    };
  };

  var super_res = superRes;

  return super_res;
});
//# sourceMappingURL=super-res.js.map