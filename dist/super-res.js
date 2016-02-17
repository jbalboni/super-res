var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('q'), require('superagent'), require('route-parser'), require('cache-manager')) : typeof define === 'function' && define.amd ? define(['q', 'superagent', 'route-parser', 'cache-manager'], factory) : global.superRes = factory(global.Q, global.superagent, global.Route, global.cacheManager);
})(this, function (Q, superagent, Route, cacheManager) {
  'use strict';

  var actionDefaults = actionDefaults = {
    method: 'GET',
    responseType: 'json',
    transformRequest: [],
    transformResponse: [],
    withCredentials: false,
    cache: null
  };

  var ResourceAction_js__assign = ResourceAction_js__assign || require('object.assign');

  var cacheDefault = { store: 'memory', max: 100, ttl: 1200 };

  function applyResponseTransforms(transforms, response) {
    return transforms.reduce(function (memo, transform) {
      return transform(memo, response.header);
    }, response.body);
  }

  function applyRequestTransforms(transforms, request, data) {
    return transforms.reduce(function (memo, transform) {
      return transform(memo, request.header);
    }, data);
  }

  var ResourceAction = (function () {
    function ResourceAction(url, defaultParams, action) {
      var _this = this;

      _classCallCheck(this, ResourceAction);

      this.config = ResourceAction_js__assign({ url: url }, actionDefaults, action);

      if (this.config.method.toUpperCase() === 'POST' || this.config.method.toUpperCase() === 'PUT' || this.config.method.toUpperCase() === 'PATCH') {
        this.canHaveData = true;
      }

      this.route = new Route(this.config.url);
      this.defaultParams = {};
      this.derivedParams = {};

      Object.getOwnPropertyNames(defaultParams || {}).forEach(function (paramName) {
        var param = defaultParams[paramName];
        if (typeof param === 'function') {
          _this.derivedParams[paramName] = param;
        } else if (typeof param === 'string' && param.startsWith('@')) {
          _this.derivedParams[paramName] = param.slice(1);
        } else {
          //add to default if it's not an @ or function param
          _this.defaultParams[paramName] = defaultParams[paramName];
        }
      });

      if (this.config.cache === true) {
        this.config.cache = cacheManager.caching(cacheDefault);
      }
    }

    _createClass(ResourceAction, [{
      key: 'getCacheKey',
      value: function getCacheKey(params, data) {
        return this.route.reverse(params) + JSON.stringify(data || {});
      }
    }, {
      key: 'buildRequest',
      value: function buildRequest(params, data) {
        var method = this.config.method.toLowerCase();
        var currentRequest = superagent[method === 'delete' ? 'del' : method](this.route.reverse(params));

        currentRequest = currentRequest.accept(this.config.responseType);
        if (this.config.headers) {
          currentRequest = currentRequest.set(this.config.headers);
        }

        if (this.config.timeout) {
          currentRequest.timeout(this.config.timeout);
        } else {
          currentRequest.clearTimeout();
        }

        if (this.config.withCredentials) {
          currentRequest = currentRequest.withCredentials();
        }

        if (data) {
          var transformedData = applyRequestTransforms(this.config.transformRequest, currentRequest, data);
          if (method === 'get') {
            currentRequest = currentRequest.query(transformedData);
          } else {
            currentRequest = currentRequest.send(transformedData);
          }
        }

        return currentRequest;
      }
    }, {
      key: 'makeRequest',
      value: function makeRequest(params, data) {
        var _this2 = this;

        var deferred = Q.defer();

        if (arguments.length === 1 && this.canHaveData) {
          data = params;
          params = undefined;
        }

        var computedParams = {};
        Object.getOwnPropertyNames(this.derivedParams).forEach(function (prop) {
          var param = _this2.derivedParams[prop];
          if (typeof param === 'function') {
            computedParams[prop] = param();
          } else {
            computedParams[prop] = data[param];
          }
        });

        var fullParams = ResourceAction_js__assign({}, this.defaultParams, computedParams, params);

        var doRequest = function doRequest() {
          _this2.buildRequest(fullParams, data).end(function (err, res) {
            if (err) {
              deferred.reject(err);
            } else {
              var transformedReponse = applyResponseTransforms(_this2.config.transformResponse, res);

              if (_this2.config.cache) {
                _this2.config.cache.set(_this2.getCacheKey(fullParams, data), transformedReponse);
              }

              deferred.resolve(transformedReponse);
            }
          });
        };

        if (this.config.cache && this.config.method.toUpperCase() === 'GET') {
          var key = this.getCacheKey(fullParams, data);
          this.config.cache.get(key, function (err, result) {
            if (err) {
              deferred.reject(err);
            } else if (result) {
              deferred.resolve(result);
            } else {
              doRequest();
            }
          });
        } else {
          doRequest();
        }

        return deferred.promise;
      }
    }]);

    return ResourceAction;
  })();

  var super_res__assign = super_res__assign || require('object.assign');

  var super_res__superRes = {};

  function generateDefaultActions(url, defaultParams) {
    var resource = {};

    var action = new ResourceAction(url, defaultParams, super_res__assign({}, actionDefaults));
    resource.get = action.makeRequest.bind(action);
    resource.query = resource.get;

    action = new ResourceAction(url, defaultParams, super_res__assign({}, actionDefaults, { method: 'POST' }));
    resource.save = action.makeRequest.bind(action);

    action = new ResourceAction(url, defaultParams, super_res__assign({}, actionDefaults, { method: 'PUT' }));
    resource.put = action.makeRequest.bind(action);

    action = new ResourceAction(url, defaultParams, super_res__assign({}, actionDefaults, { method: 'DELETE' }));
    resource.remove = action.makeRequest.bind(action);
    resource['delete'] = resource.remove;

    return resource;
  }

  super_res__superRes.resource = function (url, defaultParams, actions) {
    var resource = generateDefaultActions(url, defaultParams);
    if (actions) {
      Object.getOwnPropertyNames(actions).forEach(function (name) {
        var action = new ResourceAction(url, defaultParams, actions[name]);
        resource[name] = function () {
          action.makeRequest.apply(action, arguments);
        };
      });
    }
    return resource;
  };

  super_res__superRes.promiseWrapper = function promiseWrapper(wrapperFunc) {
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

  var super_res = super_res__superRes;

  return super_res;
});
//# sourceMappingURL=super-res.js.map