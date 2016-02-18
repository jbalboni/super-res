'use strict';

import request from 'superagent';
import Q from 'q';

var exports = {};

exports.configureRequest = function configureRequest(config, url, dataTransformer) {
  const method = config.method.toLowerCase();
  let currentRequest = request[method === 'delete' ? 'del' : method](url);

  currentRequest = currentRequest.accept(config.responseType);
  if (config.headers) {
    currentRequest = currentRequest.set(config.headers);
  }

  if (config.timeout) {
    currentRequest.timeout(config.timeout);
  } else {
    currentRequest.clearTimeout();
  }

  if (config.withCredentials) {
    currentRequest = currentRequest.withCredentials();
  }

  const transformedData = dataTransformer(currentRequest.header);
  if (transformedData) {
    if (method === 'get') {
      currentRequest = currentRequest.query(transformedData);
    } else {
      currentRequest = currentRequest.send(transformedData);
    }
  }

  return currentRequest;
};

exports.makeRequest = function makeRequest(request) {
  const deferred = Q.defer();
  request.end((err, res) => {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

export default exports;