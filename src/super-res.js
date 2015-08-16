var assign = assign || require('object.assign');

import request from 'superagent';
import Route from 'route-parser';
import Q from 'q';

let superRes = {};

const actionDefaults = {
  method: 'GET',
  responseType: 'json',
  transformRequest: [],
  transformResponse: []
};

function buildRequest(action, route, params, data) {
  let currentRequest = request;

  let method = action.method.toLowerCase();
  currentRequest = request[method === 'delete' ? 'del' : method](route.reverse(params));

  currentRequest = currentRequest.accept(action.responseType);
  if (action.headers) {
    currentRequest = currentRequest.set(action.headers);
  }

  if (data && method === 'get') {
    currentRequest = currentRequest.query(applyRequestTransforms(action.transformRequest, currentRequest, data));
  } else if (data) {
    currentRequest = currentRequest.send(applyRequestTransforms(action.transformRequest, currentRequest, data));
  }

  return currentRequest;
}

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

function buildAction(url, defaultParams, action) {
  const fullAction = assign({url: url}, actionDefaults, action);
  const route = new Route(fullAction.url);
  return function (params, data) {
    let deferred = Q.defer();
    let timeoutId;
    if (action.timeout) {
      timeoutId = setTimeout(() => {
        deferred.reject({reason: 'Timeout reached'});
      }, action.timeout);
    }
    buildRequest(fullAction, route, assign({}, defaultParams, params), data)
      .end((err, res) => {
        clearTimeout(timeoutId);
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(applyResponseTransforms(action.transformResponse, res));
        }
      });
    return deferred.promise;
  };
}

function buildDefaultActions(url, defaultParams) {
  let resource = {};
  resource.get = buildAction(url, defaultParams, assign({}, actionDefaults));
  resource.query = resource.get;
  resource.save = buildAction(url, defaultParams, assign({}, actionDefaults, {method: 'POST'}));
  resource.put = buildAction(url, defaultParams, assign({}, actionDefaults, {method: 'PUT'}));
  resource.remove = buildAction(url, defaultParams, assign({}, actionDefaults, {method: 'DELETE'}));
  resource['delete'] = resource.remove;
  return resource;
}

superRes.resource = (url, defaultParams, actions) => {
  let resource = buildDefaultActions(url, defaultParams);
  if (actions) {
    Object.getOwnPropertyNames(actions).forEach((name) => {
      resource[name] = buildAction(url, defaultParams, actions[name]);
    });
  }
  return resource;
};

superRes.proxyQ = (qInstance) => {
  return (resource) => {
    let proxiedResource = assign({}, resource);
    Object.getOwnPropertyNames(resource).forEach((name) => {
      let actionFunction = proxiedResource[name];
      proxiedResource[name] = function (...args) {
        let promise = actionFunction.apply(proxiedResource, args);
        //TODO am I swallowing rejected promises here?
        return qInstance.when(promise);
      }
    });
    return proxiedResource;
  }
};

export default superRes;
