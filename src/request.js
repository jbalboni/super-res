import Q from 'q';
import sa from 'superagent';
import methods from 'methods';
import {assignOptions} from './utils.js';

const defaultOpts = {
  responseType: 'json',
  transformRequest: [],
  catchRequestError: [],
  transformResponse: [],
  catchResponseError: [],
  withCredentials: false,
  cache: null
};

function request (method, url, options) {
  options = assignOptions(defaultOpts, options);

  let curReq = sa(method, url);
  curReq.accept(options.responseType);
  if (options.headers) {
    curReq.set(options.headers);
  }

  if (options.timeout) {
    curReq.timeout(options.timeout);
  } else {
    curReq.clearTimeout();
  }

  if (options.withCredentials) {
    curReq.withCredentials();
  }

  let originalEnd = curReq.end;
  curReq.end = function (fn) {
    if (curReq._data && typeof curReq._data === 'object') {
      try {
        curReq._data = options.transformRequest.reduce(
          (memo, transform) => transform.call(curReq, memo, curReq.header),
          curReq._data
        );
      } catch(e) {
        options.catchRequestError.reduce(
          (promise, catchFunc) => promise.catch(catchFunc),
          Q.Promise((resolve, reject) => reject(e))
        )
        .then(fn, fn);
        return this;
      }
    }
    return originalEnd.call(curReq, (err, res)=>{
      if (err) {
        options.catchResponseError.reduce(
          (promise, catchFunc) => promise.catch(catchFunc),
          Q.Promise((resolve, reject) => reject(err))
        )
        .then(fn, fn);
      } else {
        try {
          res.body = options.transformResponse.reduce(
            (memo, transform) => transform.call(res, memo),
            res.body
          );
        } catch(e) {
          return Q(e).then(fn);
        }
        return Q.spread([null, res], fn);
      }
    });
  };

  return curReq;
}

methods.forEach(function(method){
  var name = 'delete' == method ? 'del' : method;
  method = method.toUpperCase();
  Object.defineProperty(request, name, {
    value: function(url, data, fn, options){
      if ('function' === typeof data) {
        options = fn;
        fn = data;
        data = null;
      }
      var req = request(method, url, options);
      if (data) {
        req.send(data);
      }
      fn && req.end(fn);
      return req;
    },
    enumerable: true
  });
});

Object.defineProperty(request, 'config', {
  value: defaultOpts
});

export default request;