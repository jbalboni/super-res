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

function buildAction(url, action) {
  const fullAction = Object.assign({url: url}, actionDefaults, action);
  const route = new Route(fullAction.url);
  return function (params, data) {
    let deferred = Q.defer();
    let timeoutId;
    if (action.timeout) {
      timeoutId = setTimeout(() => {
        deferred.reject({reason: 'Timeout reached'});
      }, action.timeout);
    }
    buildRequest(fullAction, route, params, data)
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

function buildDefaultActions(url) {
  let resource = {};
  resource.get = buildAction(url, Object.assign({}, actionDefaults));
  resource.query = resource.get;
  resource.save = buildAction(url, Object.assign({}, actionDefaults, {method: 'POST'}));
  resource.put = buildAction(url, Object.assign({}, actionDefaults, {method: 'PUT'}));
  resource.remove = buildAction(url, Object.assign({}, actionDefaults, {method: 'DELETE'}));
  resource['delete'] = resource.remove;
  return resource;
}

superRes.resource = (url, defaultParams, actions) => {
  let resource = buildDefaultActions(url);
  if (actions) {
    Object.getOwnPropertyNames(actions).forEach((name) => {
      resource[name] = buildAction(url, actions[name]);
    });
  }
  return resource;
};

superRes.proxyQ = (qInstance) => {
  return (resource) => {
    let proxiedResource = Object.assign({}, resource);
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
