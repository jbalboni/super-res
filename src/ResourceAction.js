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

export default class ResourceAction {
  constructor(url, defaultParams, action) {
    this.config = assignOptions({url: url}, actionDefaults, action);

    if(this.config.method === 'GET') {
      this.config.transformRequest || (this.config.transformRequest = []);
      this.config.transformRequest.push(moveDataToParam);
    }

    this.route = new Route(this.config.url);
    this.defaultParams = defaultParams;

    if (this.config.cache === true) {
      this.config.cache = cacheManager.caching({store: 'memory', max: 100, ttl: 1200});
    }
  }
  getCacheKey(params, data) {
    return this.route.reverse(params) + JSON.stringify(data);
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
    let fullParams = assign({}, this.defaultParams, params);

    let doRequest = () => {
      this.buildRequest(fullParams, data)
          .end((err, res) => {
            if (err) {
              deferred.reject(err);
            } else {

              if (this.config.cache) {
                this.config.cache.set(this.getCacheKey(fullParams, data), res.body);
              }

              deferred.resolve(res.body);
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