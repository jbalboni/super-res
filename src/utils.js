var assign = assign || require('object.assign');

export function assignOptions(...opts) {
  let result = {};

  opts.reduce((result, opt)=> {
    if(opt) {
      for(let i in opt) {
        if(typeof opt[i] === 'object' && opt[i] !== null) {
          if(Array.isArray(opt[i])) {
            if(!Array.isArray(result[i])) {
              result[i] = [];
            }
            result[i] = result[i].concat(opt[i]);

          } else {
            if(typeof result[i] !== 'object' || result[i] === null || Array.isArray(result[i])) {
              result[i] = {};
            }
            assign(result[i], opt[i]); //1 depth merging only.
          }
        } else {
          opt[i] !== undefined && (result[i] = opt[i]);
        }
      }
    }
    return result;
  }, result);

  return result;
}

function encodeUriSegment(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '%20').
    replace(/%26/gi, '&').
    replace(/%3D/gi, '=').
    replace(/%2B/gi, '+');
}

function forEach(obj, iterator, context) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      iterator.call(context, obj[key], key, obj);
    }
  }
  return obj;
}

export function parseUrl (url, params) {

  let urlParams = {}, val, query, encodedVal;

  forEach(url.split(/\W/), function(param) {
    if (param === 'hasOwnProperty') {
      throw new Error('badname: hasOwnProperty is not a valid parameter name.');
    }
    if (!(new RegExp('^\\d+$').test(param)) && param &&
      (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url))) {
      urlParams[param] = true;
    }
  });
  url = url.replace(/\\:/g, ':');

  params = params || {};
  forEach(urlParams, function(_, urlParam) {
    val = params[urlParam];
    if (typeof val !== 'undefined' && val !== null) {
      encodedVal = encodeUriSegment(val);
      url = url.replace(new RegExp(':' + urlParam + '(\\W|$)', 'g'), function(match, p1) {
        return encodedVal + p1;
      });
    } else {
      url = url.replace(new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g'), function(match,
                                                                                   leadingSlashes, tail) {
        if (tail.charAt(0) == '/') {
          return tail;
        } else {
          return leadingSlashes + tail;
        }
      });
    }
  });

  // strip trailing slashes and set the url (unless this behavior is specifically disabled)
  url = url.replace(/\/+$/, '') || '/';

  // then replace collapse `/.` if found in the last URL path segment before the query
  // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
  url = url.replace(/\/\.(?=\w+($|\?))/, '.');
  // replace escaped `/\.` with `/.`
  url = url.replace(/\/\\\./, '/.');


  // set params - delegate param encoding to $http
  forEach(params, function(value, key) {
    if (!urlParams[key]) {
      query || (query = {});
      query[key] = value;
    }
  });

  return {
    url: url,
    query: query
  }
}