var assign = assign || require('object.assign');

import Q from 'q';
import request from 'superagent';
import Route from 'route-parser';
import cacheManager from 'cache-manager';

import actionDefaults from './actionDefaults.js';

const cacheDefault = {store: 'memory', max: 100, ttl: 1200};

function applyResponseTransforms(transforms, response) {
  return transforms.reduce(function (memo, transform) {
    return transform(memo, response.header);
  }, response.body);
}

function applyRequestTransforms(transforms, request, data) {
  return transforms.reduce(function (memo, transform) {
    return transform(memo, request.header);
  }, data);
}

export default class ResourceAction {
  constructor(url, defaultParams, action) {
    this.config = assign({url: url}, actionDefaults, action);

    if((this.config.method.toUpperCase() === 'POST' ||
      this.config.method.toUpperCase() === 'PUT' ||
      this.config.method.toUpperCase() === 'PATCH')) {
      this.canHaveData = true;
    }

    this.route = new Route(this.config.url);
    this.defaultParams = {};
    this.derivedParams = {};

    Object.getOwnPropertyNames(defaultParams)
      .forEach((paramName) => {
        let param = defaultParams[paramName];
        if (typeof param === 'function') {
          this.derivedParams[paramName] = param;
        } else if (typeof param === 'string' && param.startsWith('@')) {
          this.derivedParams[paramName] = param.slice(1);
        } else {
          //add to default if it's not an @ or function param
          this.defaultParams[paramName] = defaultParams[paramName];
        }
      });

    if (this.config.cache === true) {
      this.config.cache = cacheManager.caching(cacheDefault);
    }
  }
  getCacheKey(params, data) {
    return this.route.reverse(params) + JSON.stringify(data || {});
  }
  buildRequest(params, data) {
    let method = this.config.method.toLowerCase();
    let currentRequest = request[method === 'delete' ? 'del' : method](this.route.reverse(params));

    currentRequest = currentRequest.accept(this.config.responseType);
    if (this.config.headers) {
      currentRequest = currentRequest.set(this.config.headers);
    }

    if (this.config.timeout) {
      currentRequest.timeout(this.config.timeout);
    } else {
      currentRequest.clearTimeout();
    }

    if (this.config.withCredentials) {
      currentRequest = currentRequest.withCredentials();
    }

    if (data) {
      let transformedData = applyRequestTransforms(this.config.transformRequest, currentRequest, data);
      if (method === 'get') {
        currentRequest = currentRequest.query(transformedData);
      } else {
        currentRequest = currentRequest.send(transformedData);
      }
    }

    return currentRequest;
  }
  makeRequest(params, data) {
    let deferred = Q.defer();

    if(arguments.length === 1 && this.canHaveData) {
      data = params;
      params = undefined;
    }

    let computedParams = {};
    Object.getOwnPropertyNames(this.derivedParams)
      .forEach((prop) => {
          let param = this.derivedParams[prop];
          if(typeof param === 'function') {
            computedParams[prop] = param();
          } else {
            computedParams[prop] = data[param];
          }
      });

    let fullParams = assign({}, this.defaultParams, computedParams, params);

    let doRequest = () => {
      this.buildRequest(fullParams, data)
          .end((err, res) => {
            if (err) {
              deferred.reject(err);
            } else {
              let transformedReponse = applyResponseTransforms(this.config.transformResponse, res);

              if (this.config.cache) {
                this.config.cache.set(this.getCacheKey(fullParams, data), transformedReponse);
              }

              deferred.resolve(transformedReponse);
            }
          });
    };

    if (this.config.cache && this.config.method.toUpperCase() === 'GET') {
      let key = this.getCacheKey(fullParams, data);
      this.config.cache.get(key, (err, result) => {
        if (err) {
          deferred.reject(err);
        } else if (result) {
          deferred.resolve(result);
        } else {
          doRequest();
        }
      })
    } else {
      doRequest();
    }

    return deferred.promise;
  }
}