var assign = assign || require('object.assign');

import createRequestor from './createRequestor.js';

const superRes = {};

function generateDefaultActions(url, defaultParams) {
  const resource = {};

  resource.get = createRequestor(url, defaultParams);
  resource.query = resource.get;
  resource.save = createRequestor(url, defaultParams, {method: 'POST'});
  resource.put = createRequestor(url, defaultParams, {method: 'PUT'});
  resource.remove = createRequestor(url, defaultParams, {method: 'DELETE'});
  resource['delete'] = resource.remove;

  return resource;
}

superRes.resource = (url, defaultParams, actions) => {
  const resource = generateDefaultActions(url, defaultParams);
  if (actions) {
    Object.getOwnPropertyNames(actions).forEach((name) => {
      resource[name] = createRequestor(url, defaultParams, actions[name]);
    });
  }
  return resource;
};

superRes.promiseWrapper = function promiseWrapper(wrapperFunc) {
  return (resource) => {
    let proxiedResource = assign({}, resource);
    Object.getOwnPropertyNames(resource).forEach((name) => {
      let actionFunction = proxiedResource[name];
      proxiedResource[name] = function (...args) {
        let promise = actionFunction.apply(proxiedResource, args);
        return wrapperFunc(promise);
      }
    });
    return proxiedResource;
  }
};

export default superRes;
