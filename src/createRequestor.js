import Q from 'q';
import request from 'superagent';
import Route from 'route-parser';
import cacheManager from 'cache-manager';

import superagentAdapter from './superagentAdapter.js';
import actionDefaults from './actionDefaults.js';

const cacheDefault = {store: 'memory', max: 100, ttl: 1200};
const assign = assign || require('object.assign');


function createResponseTransformer(transforms) {
  return function applyResponseTransforms(response) {
    return Q.resolve(transforms.reduce(function(memo, transform) {
      return transform(memo, response.header);
    }, response.body));
  };
}

function applyRequestTransforms(transforms, header, data) {
  return transforms.reduce(function(memo, transform) {
    return transform(memo, header);
  }, data);
}

//Only certain http methods can have data sent with them
//This could be limiting to users
function canHaveData(method) {
  const methodUpper = method.toUpperCase();
  return methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'PATCH';
}

function getParameters(defaultParamConfig) {
  return Object.getOwnPropertyNames(defaultParamConfig)
    .reduce((params, paramName) => {
      let param = defaultParamConfig[paramName];
      if (typeof param === 'function') {
        params.derivedParams[paramName] = param;
      } else if (typeof param === 'string' && param.startsWith('@')) {
        params.derivedParams[paramName] = param.slice(1);
      } else {
        //add to default if it's not an @ or function param
        params.defaultParams[paramName] = param;
      }
      return params;
    }, {derivedParams: {}, defaultParams: {}});
}

function createCacheKeyGetter(route) {
  return function getCacheKey(params, data) {
    return route.reverse(params) + JSON.stringify(data || {});
  }
}

function checkCache(method, cache, key) {
  const deferred = Q.defer();
  if (cache && method.toUpperCase() === 'GET') {
    cache.get(key, (err, result) => {
      if (err) {
        deferred.reject(err);
      } else if (result) {
        deferred.resolve({found: true, result});
      } else {
        deferred.resolve({found: false});
      }
    })
  } else {
    deferred.resolve({found: false});
  }
  return deferred.promise;
}

function expandParams(derivedParams, defaultParams, data) {
  return Object.getOwnPropertyNames(derivedParams)
    .reduce((computedParams, prop) => {
      let param = derivedParams[prop];
      if (typeof param === 'function') {
        computedParams[prop] = param();
      } else {
        computedParams[prop] = data[param];
      }
      return computedParams;
    }, assign({}, defaultParams));
}

function createRequestTransformer(transform, data) {
  return (header) => {
    return data ? applyRequestTransforms(transform, header, data) : null;
  }
}

/*
 * Returns a function that will make http requests based on the configuration passed to it
 */
export default function createRequestor(url, defaultParamConfig, action) {
  const config = assign({url: url}, actionDefaults, action);
  const route = new Route(config.url);
  const {derivedParams, defaultParams} = getParameters(defaultParamConfig || {});
  const transformResponse = createResponseTransformer(config.transformResponse);
  const getCacheKey = createCacheKeyGetter(route);

  config.cache = config.cache === true ? cacheManager.caching(cacheDefault) : config.cache;

  return function(params, data) {
    //if there's only one argument, assume it's the data instead of the second param
    //I don't like this, but it is consistent with angular-resource
    if (arguments.length === 1 && canHaveData(config.method)) {
      data = params;
      params = undefined;
    }
    const fullParams = assign(expandParams(derivedParams, defaultParams, data), params);
    const url = route.reverse(fullParams);
    //The superagent interface has two phases, configure and makeRequest. The need for this is debatable
    const configuredHttpRequest = superagentAdapter.configureRequest(config, url, createRequestTransformer(config.transformRequest, data));
    const cacheKey = getCacheKey(fullParams, data);
    return checkCache(config.method, config.cache, cacheKey)
      .then(function cacheSuccess({found, result}) {
        if (found) {
          return Q.resolve(result);
        } else {
          return superagentAdapter.makeRequest(configuredHttpRequest)
            .then(transformResponse)
            .then(function cacheResponse(response) {
              if (config.cache) {
                config.cache.set(cacheKey, response);
              }
              return Q.resolve(response);
            });
        }

      });
  }
}
