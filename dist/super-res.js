var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('q'), require('route-parser'), require('superagent'), require('methods'), require('cache-manager')) : typeof define === 'function' && define.amd ? define(['q', 'route-parser', 'superagent', 'methods', 'cache-manager'], factory) : global.superRes = factory(global.Q, global.Route, global.sa, global.methods, global.cacheManager);
})(this, function (Q, Route, sa, methods, cacheManager) {
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
    headers: {},
    transformRequest: [],
    catchRequestError: [],
    transformResponse: [],
    catchResponseError: [],
    withCredentials: false,
    cache: null
  };

  var defaultCache = cacheManager.caching({ store: 'memory', max: 100, ttl: 1200 });

  function getCacheKey(url, params, data) {
    return url + '_' + (typeof params === 'string' ? params : JSON.stringify(params || {})) + '_' + (typeof data === 'string' ? data : JSON.stringify(data || {}));
  }

  function request(method, url, options) {
    options = assignOptions(defaultOpts, options);

    var curReq = sa(method, url);
    curReq.accept(options.responseType);
    curReq.set(options.headers);

    if (options.timeout) {
      curReq.timeout(options.timeout);
    } else {
      curReq.clearTimeout();
    }

    if (options.withCredentials) {
      curReq.withCredentials();
    }

    if (options.cache == true) {
      options.cache = defaultCache;
    }

    var originalEnd = curReq.end;
    curReq.end = function (fn) {
      var _this = this;

      var key = undefined;
      options.cache && (key = getCacheKey(this.url, this._query, this._data));

      var doRequest = function doRequest() {
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
            return _this;
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

              if (options.cache) {
                options.cache.set(key, res);
              }
            } catch (e) {
              return Q(e).then(fn);
            }
            Q.spread([null, res], fn);
          }
        });
      };

      if (options.cache && this.method === 'GET') {
        options.cache.get(key, function (err, result) {
          if (err || result) {
            Q.spread([err, result], fn);
            return _this;
          } else {
            return doRequest();
          }
        });
      } else {
        return doRequest();
      }
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
    transformRequest: []
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
      } else if (this.config.method === 'POST' || this.config.method === 'PUT' || this.config.method === 'PATCH') {
        this.hasData = true;
      }

      this.route = new Route(this.config.url);
      this.defaultParams = defaultParams;

      this.extraParams = {};
      for (var i in defaultParams) {
        var param = defaultParams[i];
        if (typeof param === 'function') {
          this.extraParams[i] = param;
        } else if (typeof param === 'string' && param[0] === '@') {
          this.extraParams[i] = param.slice(1);
        } else {
          continue;
        }
        delete this.defaultParams[i];
      }
    }

    _createClass(ResourceAction, [{
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
        var deferred = Q.defer();

        if (arguments.length == 1 && this.hasData) {
          data = params;
          params = undefined;
        }

        var extraP = {};
        for (var i in this.extraParams) {
          var p = this.extraParams[i],
              result = undefined;
          if (typeof p === 'function') {
            result = p();
          } else {
            result = data[p];
          }
          result && (extraP[i] = result);
        }

        var fullParams = ResourceAction_js__assign({}, this.defaultParams, extraP, params);

        this.buildRequest(fullParams, data).end(function (err, res) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(res.body);
          }
        });

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
        var action = new ResourceAction(url, defaultParams, super_res__assign({}, commonOptions, actions[name]));
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