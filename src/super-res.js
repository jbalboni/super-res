var assign = assign || require('object.assign');

import request from 'superagent';
import Route from 'route-parser';
import Q from 'q';

let superRes = {};

const actionDefaults = {
  method: 'GET',
  responseType: 'json'
};

function buildRequest(action, route, params, data) {
  let currentRequest = request;

  let method = action.method.toLowerCase();
  currentRequest = request[method === 'delete' ? 'del' : method](route.reverse(params));

  currentRequest = currentRequest.accept(action.responseType);

  if (data && method === 'get') {
    currentRequest = currentRequest.query(data);
  } else if (data) {
    currentRequest = currentRequest.send(data);
  }

  return currentRequest;
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
          deferred.resolve(res.body);
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
        return qInstance.when(promise);
      }
    });
    return proxiedResource;
  }
};

export default superRes;
