var assign = assign || require('object.assign');

import Q from 'q';

import request from './request.js';
import {assignOptions, parseUrl} from './utils.js'

const actionDefaults = {
  method: 'GET',
  transformRequest: []
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
    } else if((this.config.method === 'POST' ||
      this.config.method === 'PUT' ||
      this.config.method === 'PATCH')) {
      this.hasData = true;
    }

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
  }

  buildRequest(params, data) {
    let method = this.config.method.toLowerCase();
    let {url, query} = parseUrl(this.config.url, params);

    let currentRequest = request[method === 'delete' ? 'del' : method](url, null, null, this.config);

    if(query) {
      currentRequest.query(query);
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

    this.buildRequest(fullParams, data)
      .end((err, res) => {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(res.body);
        }
      });

    return deferred.promise;
  }
}