var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('q'), require('superagent'), require('route-parser')) : typeof define === 'function' && define.amd ? define(['q', 'superagent', 'route-parser'], factory) : global.superRes = factory(global.Q, global.superagent, global.Route);
})(this, function (Q, superagent, Route) {
  'use strict';

  var actionDefaults = actionDefaults = {
    method: 'GET',
    responseType: 'json',
    transformRequest: [],
    transformResponse: []
  };

  var ResourceAction_js__assign = ResourceAction_js__assign || require('object.assign');

  function applyResponseTransforms(transforms, response) {
    return transforms.reduceRight(function (memo, transform) {
      return transform(memo, response.header);
    }, response.body);
  }

  function applyRequestTransforms(transforms, request, data) {
    return transforms.reduceRight(function (memo, transform) {
      return transform(memo, request.header);
    }, data);
  }

  var ResourceAction = (function () {
    function ResourceAction(url, defaultParams, action) {
      _classCallCheck(this, ResourceAction);

      this.config = ResourceAction_js__assign({ url: url }, actionDefaults, action);
      this.route = new Route(this.config.url);
      this.defaultParams = defaultParams;
    }

    _createClass(ResourceAction, [{
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

        if (data && method === 'get') {
          currentRequest = currentRequest.query(applyRequestTransforms(this.config.transformRequest, currentRequest, data));
        } else if (data) {
          currentRequest = currentRequest.send(applyRequestTransforms(this.config.transformRequest, currentRequest, data));
        }

        return currentRequest;
      }
    }, {
      key: 'makeRequest',
      value: function makeRequest(params, data) {
        var _this = this;

        var deferred = Q.defer();

        console.log(superagent);
        this.buildRequest(ResourceAction_js__assign({}, this.defaultParams, params), data).end(function (err, res) {
          console.log('here');
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(applyResponseTransforms(_this.config.transformResponse, res));
          }
        });
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
        resource[name] = new ResourceAction(url, defaultParams, actions[name]).makeRequest;
      });
    }
    return resource;
  };

  super_res__superRes.promiseWrapper = function promiseWrapper(promiseObj) {
    return function (resource) {
      var proxiedResource = super_res__assign({}, resource);
      Object.getOwnPropertyNames(resource).forEach(function (name) {
        var actionFunction = proxiedResource[name];
        proxiedResource[name] = function () {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var promise = actionFunction.apply(proxiedResource, args);
          //TODO am I swallowing rejected promises here?
          return promiseObj.when(promise);
        };
      });
      return proxiedResource;
    };
  };

  var super_res = super_res__superRes;

  return super_res;
});
//# sourceMappingURL=super-res.js.map