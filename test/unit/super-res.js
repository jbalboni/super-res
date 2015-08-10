import superRes from '../../src/super-res';
import Q from 'q';

describe('superRes', () => {
  let promise;
  describe('Resource get', () => {
    beforeEach(() => {
      promise = superRes.proxyQ(Q)(superRes.resource('http://jsonplaceholder.typicode.com/posts/:id', {update: { method: 'GET'}})).get({id: 2});
    });

    it('should have been run once', (done) => {
      promise.then((res) => {
        console.log(res);
        done();
      });
    });

  });
});
