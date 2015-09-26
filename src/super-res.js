var assign = assign || require('object.assign');

import Q from 'q';

import ResourceAction from './ResourceAction.js';
import request from './request.js'

let superRes = {};

function generateDefaultActions(url, defaultParams, commonOptions) {
  let resource = {};

  let action = new ResourceAction(url, defaultParams, assign({}, commonOptions));
  resource.get = action.makeRequest.bind(action);
  resource.query = resource.get;

  action = new ResourceAction(url, defaultParams, assign({}, commonOptions, {method: 'POST'}));
  resource.save = action.makeRequest.bind(action);

  action = new ResourceAction(url, defaultParams, assign({}, commonOptions, {method: 'PUT'}));
  resource.put = action.makeRequest.bind(action);

  action = new ResourceAction(url, defaultParams, assign({}, commonOptions, {method: 'DELETE'}));
  resource.remove = action.makeRequest.bind(action);
  resource['delete'] = resource.remove;

  return resource;
}

superRes.resource = (url, defaultParams, actions, commonOptions) => {
  let resource = generateDefaultActions(url, defaultParams, commonOptions);
  if (actions) {
    Object.getOwnPropertyNames(actions).forEach((name) => {
      let action = new ResourceAction(url, defaultParams, actions[name]);
      resource[name] = function (...args) {
        action.makeRequest(...args);
      }
    });
  }
  return resource;
};

superRes.request = request;
superRes.config = request.config;

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
