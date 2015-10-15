var assign = assign || require('object.assign');

import Q from 'q';
import request from 'superagent';
import Route from 'route-parser';
import cacheManager from 'cache-manager';

import actionDefaults from './actionDefaults.js';

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

export default class ResourceAction {
  constructor(url, defaultParams, action) {
    this.config = assign({url: url}, actionDefaults, action);

    if((this.config.method === 'POST' ||
      this.config.method === 'PUT' ||
      this.config.method === 'PATCH')) {
      this.hasData = true;
    }

    this.route = new Route(this.config.url);
    this.defaultParams = defaultParams;

    this.extraParams = {};
    for(let i in defaultParams) {
      let param = defaultParams[i];
      if(typeof param === 'function') {
        this.extraParams[i] = param;
      } else if(typeof param === 'string' && param[0] === '@') {
        this.extraParams[i] = param.slice(1);
      } else {
        continue;
      }
      delete this.defaultParams[i];
    }

    if (this.config.cache === true) {
      this.config.cache = cacheManager.caching({store: 'memory', max: 100, ttl: 1200});
    }
  }
  getCacheKey(params, data) {
    return this.route.reverse(params) + JSON.stringify(params || {}) + JSON.stringify(data || {});
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

    if(arguments.length == 1 && this.hasData) {
      data = params;
      params = undefined;
    }

    let extraP = {};
    for(let i in this.extraParams) {
      let p = this.extraParams[i], result;
      if(typeof p === 'function') {
        result = p();
      } else {
        result = data[p];
      }
      result && (extraP[i] = result);
    }

    let fullParams = assign({}, this.defaultParams, extraP, params);

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

    if (this.config.cache && this.config.method.toLowerCase() === 'get') {
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