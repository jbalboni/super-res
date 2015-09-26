var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('q'), require('route-parser'), require('cache-manager'), require('superagent'), require('methods')) : typeof define === 'function' && define.amd ? define(['q', 'route-parser', 'cache-manager', 'superagent', 'methods'], factory) : global.superRes = factory(global.Q, global.Route, global.cacheManager, global.sa, global.methods);
})(this, function (Q, Route, cacheManager, sa, methods) {
  'use strict';

  var utils_js__assign = utils_js__assign || require('object.assign');

  function assignOptions() {
    var result = {};

    for (var _len = arguments.length, opts = Array(_len), _key = 0; _key < _len; _key++) {
      opts[_key] = arguments[_key];
    }

    opts.reduce(function (result, opt) {
      if (opt) {
        for (var i in opt) {
          if (typeof opt[i] === 'object' && opt[i] !== null) {
            if (Array.isArray(opt[i])) {
              if (!Array.isArray(result[i])) {
                result[i] = [];
              }
              result[i] = result[i].concat(opt[i]);
            } else {
              if (typeof result[i] !== 'object' || result[i] === null || Array.isArray(result[i])) {
                result[i] = {};
              }
              utils_js__assign(result[i], opt[i]); //1 depth merging only.
            }
          } else {
              opt[i] !== undefined && (result[i] = opt[i]);
            }
        }
      }
      return result;
    }, result);

    return result;
  }

  var defaultOpts = {
    responseType: 'json',
    transformRequest: [],
    catchRequestError: [],
    transformResponse: [],
    catchResponseError: [],
    withCredentials: false,
    cache: null
  };

  function request(method, url, options) {
    options = assignOptions(defaultOpts, options);

    var curReq = sa(method, url);
    curReq.accept(options.responseType);
    if (options.headers) {
      curReq.set(options.headers);
    }

    if (options.timeout) {
      curReq.timeout(options.timeout);
    } else {
      curReq.clearTimeout();
    }

    if (options.withCredentials) {
      curReq.withCredentials();
    }

    var originalEnd = curReq.end;
    curReq.end = function (fn) {
      if (curReq._data && typeof curReq._data === 'object') {
        try {
          curReq._data = options.transformRequest.reduce(function (memo, transform) {
            return transform.call(curReq, memo, curReq.header);
          }, curReq._data);
        } catch (e) {
          options.catchRequestError.reduce(function (promise, catchFunc) {
            return promise['catch'](catchFunc);
          }, Q.Promise(function (resolve, reject) {
            return reject(e);
          })).then(fn, fn);
          return this;
        }
      }
      return originalEnd.call(curReq, function (err, res) {
        if (err) {
          options.catchResponseError.reduce(function (promise, catchFunc) {
            return promise['catch'](catchFunc);
          }, Q.Promise(function (resolve, reject) {
            return reject(err);
          })).then(fn, fn);
        } else {
          try {
            res.body = options.transformResponse.reduce(function (memo, transform) {
              return transform.call(res, memo);
            }, res.body);
          } catch (e) {
            return Q(e).then(fn);
          }
          return Q.spread([null, res], fn);
        }
      });
    };

    return curReq;
  }

  methods.forEach(function (method) {
    var name = 'delete' == method ? 'del' : method;
    method = method.toUpperCase();
    Object.defineProperty(request, name, {
      value: function value(url, data, fn, options) {
        if ('function' === typeof data) {
          options = fn;
          fn = data;
          data = null;
        }
        var req = request(method, url, options);
        if (data) {
          req.send(data);
        }
        fn && req.end(fn);
        return req;
      },
      enumerable: true
    });
  });

  Object.defineProperty(request, 'config', {
    value: defaultOpts
  });

  var ResourceAction_js__assign = ResourceAction_js__assign || require('object.assign');

  var actionDefaults = {
    method: 'GET',
    transformRequest: [],
    cache: null
  };

  function moveDataToParam(data, header) {
    data && this.query(data);
    return null;
  }

  var ResourceAction = (function () {
    function ResourceAction(url, defaultParams, action) {
      _classCallCheck(this, ResourceAction);

      this.config = assignOptions({ url: url }, actionDefaults, action);

      if (this.config.method === 'GET') {
        this.config.transformRequest || (this.config.transformRequest = []);
        this.config.transformRequest.push(moveDataToParam);
      }

      this.route = new Route(this.config.url);
      this.defaultParams = defaultParams;

      if (this.config.cache === true) {
        this.config.cache = cacheManager.caching({ store: 'memory', max: 100, ttl: 1200 });
      }
    }

    _createClass(ResourceAction, [{
      key: 'getCacheKey',
      value: function getCacheKey(params, data) {
        return this.route.reverse(params) + JSON.stringify(data);
      }
    }, {
      key: 'buildRequest',
      value: function buildRequest(params, data) {
        var method = this.config.method.toLowerCase();
        var url = this.route.reverse(params);

        for (var i in this.route.match(url)) {
          delete params[i];
        }
        var empty = true;
        if (params) {
          for (var i in params) {
            empty = false;
            break;
          }
        }

        var currentRequest = request[method === 'delete' ? 'del' : method](url, null, null, this.config);

        if (!empty) {
          currentRequest.query(params);
        }

        if (data) {
          currentRequest.send(data);
        }

        return currentRequest;
      }
    }, {
      key: 'makeRequest',
      value: function makeRequest(params, data) {
        var _this = this;

        var deferred = Q.defer();
        var fullParams = ResourceAction_js__assign({}, this.defaultParams, params);

        var doRequest = function doRequest() {
          _this.buildRequest(fullParams, data).end(function (err, res) {
            if (err) {
              deferred.reject(err);
            } else {

              if (_this.config.cache) {
                _this.config.cache.set(_this.getCacheKey(fullParams, data), res.body);
              }

              deferred.resolve(res.body);
            }
          });
        };

        if (this.config.cache && this.config.method.toLowerCase() === 'get') {
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

  function generateDefaultActions(url, defaultParams, commonOptions) {
    var resource = {};

    var action = new ResourceAction(url, defaultParams, super_res__assign({}, commonOptions));
    resource.get = action.makeRequest.bind(action);
    resource.query = resource.get;

    action = new ResourceAction(url, defaultParams, super_res__assign({}, commonOptions, { method: 'POST' }));
    resource.save = action.makeRequest.bind(action);

    action = new ResourceAction(url, defaultParams, super_res__assign({}, commonOptions, { method: 'PUT' }));
    resource.put = action.makeRequest.bind(action);

    action = new ResourceAction(url, defaultParams, super_res__assign({}, commonOptions, { method: 'DELETE' }));
    resource.remove = action.makeRequest.bind(action);
    resource['delete'] = resource.remove;

    return resource;
  }

  super_res__superRes.resource = function (url, defaultParams, actions, commonOptions) {
    var resource = generateDefaultActions(url, defaultParams, commonOptions);
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

  super_res__superRes.request = request;
  super_res__superRes.config = request.config;

  super_res__superRes.promiseWrapper = function promiseWrapper(wrapperFunc) {
    return function (resource) {
      var proxiedResource = super_res__assign({}, resource);
      Object.getOwnPropertyNames(resource).forEach(function (name) {
        var actionFunction = proxiedResource[name];
        proxiedResource[name] = function () {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
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