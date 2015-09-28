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