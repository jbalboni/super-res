var assign = assign || require('object.assign');

import Q from 'q';
import Route from 'route-parser';
import cacheManager from 'cache-manager';

import request from './request.js';
import {assignOptions} from './utils.js'

const actionDefaults = {
  method: 'GET',
  transformRequest: [],
  cache: null
};

function moveDataToParam(data, header) {
  data && this.query(data);
  return null
}

function getCacheKey(params, data) {
  return JSON.stringify(params || {}) + JSON.stringify(data || {});
}

export default class ResourceAction {
  constructor(url, defaultParams, action) {
    this.config = assignOptions({url: url}, actionDefaults, action);

    if(this.config.method === 'GET') {
      this.config.transformRequest || (this.config.transformRequest = []);
      this.config.transformRequest.push(moveDataToParam);
    } else if((this.config.method === 'POST' ||
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

  buildRequest(params, data) {
    let method = this.config.method.toLowerCase();
    let url = this.route.reverse(params);

    for(let i in this.route.match(url)) {
      delete params[i];
    }
    let empty = true;
    if(params) {
      for(let i in params) {
        empty = false;
        break;
      }
    }

    let currentRequest = request[method === 'delete' ? 'del' : method](url, null, null, this.config);

    if(!empty) {
      currentRequest.query(params);
    }

    if (data) {
      currentRequest.send(data);
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

              if (this.config.cache) {
                this.config.cache.set(getCacheKey(fullParams, data), res.body);
              }

              deferred.resolve(res.body);
            }
          });
    };

    if (this.config.cache && this.config.method.toLowerCase() === 'get') {
      let key = getCacheKey(fullParams, data);
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