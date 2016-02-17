var assign = assign || require('object.assign');

import Q from 'q';
import request from 'superagent';
import Route from 'route-parser';
import cacheManager from 'cache-manager';

import superagentAdapter from './superagentAdapter.js';
import actionDefaults from './actionDefaults.js';

const cacheDefault = {store: 'memory', max: 100, ttl: 1200};

function createResponseTransformer(transforms) {
  return function applyResponseTransforms(response) {
    return Q.resolve(transforms.reduce(function (memo, transform) {
      return transform(memo, response.header);
    }, response.body));
  };
}

function applyRequestTransforms(transforms, header, data) {
  return transforms.reduce(function (memo, transform) {
    return transform(memo, header);
  }, data);
}

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
        deferred.resolve(result);
      } else {
        deferred.reject();
      }
    })
  } else {
    deferred.reject();
  }
  return deferred.promise;
}

function expandParams(derivedParams, defaultParams, data) {
  return Object.getOwnPropertyNames(derivedParams)
      .reduce((computedParams, prop) => {
        let param = derivedParams[prop];
        if(typeof param === 'function') {
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

export default function createRequestor(url, defaultParamConfig, action) {
  const config = assign({url: url}, actionDefaults, action);
  //const canHaveData = canHaveData(config.method);
  const route = new Route(config.url);
  const {derivedParams, defaultParams} = getParameters(defaultParamConfig || {});
  const transformResponse = createResponseTransformer(config.transformResponse);
  const getCacheKey = createCacheKeyGetter(route);

  config.cache = config.cache === true ? cacheManager.caching(cacheDefault) : config.cache;

  return function(params, data) {
    if(arguments.length === 1 && canHaveData(config.method)) {
      data = params;
      params = undefined;
    }
    const fullParams = assign(expandParams(derivedParams, defaultParams, data), params);
    const configuredHttpRequest = superagentAdapter.configureRequest(config, route, fullParams, createRequestTransformer(config.transformRequest, data));
    const cacheKey = getCacheKey(fullParams, data);
    return checkCache(method, config.cache, cacheKey)
      .then(function cacheSuccess(result) {
        return Q.resolve(result);
      })
      .catch(function cacheMiss() {
        return superagentAdapter.makeRequest(configuredHttpRequest)
            .then(transformResponse)
            .then(function cacheResponse(response) {
              if (config.cache) {
                config.cache.set(cacheKey, reponse);
              }
              return Q.resolve(response);
            });
      });
  }
}
