import proxyquire from 'proxyquire';
import Q from 'q';

describe('ResourceAction', () => {
  let ResourceAction;
  let stubs;
  let cacheStub;

  beforeEach(() => {
    cacheStub = {
      get: stub(),
      set: stub()
    };
    stubs = {
      superagent: {
        get: stub().returnsThis(),
        post: stub().returnsThis(),
        put: stub().returnsThis(),
        set: stub().returnsThis(),
        send: stub().returnsThis(),
        query: stub().returnsThis(),
        accept: stub().returnsThis(),
        end: stub().returnsThis(),
        clearTimeout: stub().returnsThis(),
        timeout: stub().returnsThis(),
        withCredentials: stub().returnsThis()
      },
      'cache-manager': {
        caching: stub().returns(cacheStub)
      }
    };

    ResourceAction = proxyquire('../../src/ResourceAction', stubs);
  });

  describe('get request with no data', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest();
    });

    it('should have called get with url', () => {
      expect(stubs.superagent.get.calledWith(url)).to.be.true;
    });
    it('should have called end', () => {
      expect(stubs.superagent.end.called).to.be.true;
    });
    it('should not have called query or send', () => {
      expect(stubs.superagent.query.called).to.be.false;
      expect(stubs.superagent.send.called).to.be.false;
    });
  });

  describe('get request with data', () => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest(null, queryData);
    });

    it('should have called query', () => {
      expect(stubs.superagent.query.calledWith(queryData)).to.be.true;
    });
  });

  describe('get request with params and data', () => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:someParam';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest({someParam: 'testing'}, queryData);
    });

    it('should have called query', () => {
      expect(stubs.superagent.query.calledWith(queryData)).to.be.true;
    });
    it('should have replaced the url token', () => {
      expect(stubs.superagent.get.calledWith('http://example.com/posts/testing')).to.be.true;
    });
  });

  describe('post request with data', () => {
    let result;
    let postData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST'});
      result = resource.makeRequest(null, postData);
    });

    it('should have called post with url', () => {
      expect(stubs.superagent.post.calledWith(url)).to.be.true;
    });
    it('should have called send', () => {
      expect(stubs.superagent.send.calledWith(postData)).to.be.true;
    });
    it('should not have called query', () => {
      expect(stubs.superagent.query.called).to.be.false;
    });
  });

  describe('request with response type', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST', responseType: 'json'});
      result = resource.makeRequest();
    });

    it('should have called accept with json', () => {
      expect(stubs.superagent.accept.calledWith('json')).to.be.true;
    });
  });

  describe('request with headers', () => {
    let result;
    let headers = {'Content-Type': 'application/json'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST', responseType: 'json', headers: headers});
      result = resource.makeRequest();
    });

    it('should have called set', () => {
      expect(stubs.superagent.set.calledWith(headers)).to.be.true;
    });
  });

  describe('request with timeout', () => {
    let result;
    let headers = {'Content-Type': 'application/json'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST', timeout: 30});
      result = resource.makeRequest();
    });

    it('should have called timeout', () => {
      expect(stubs.superagent.timeout.calledWith(30)).to.be.true;
    });
  });

  describe('request without timeout', () => {
    let result;
    let headers = {'Content-Type': 'application/json'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST'});
      result = resource.makeRequest();
    });

    it('should not have called timeout', () => {
      expect(stubs.superagent.timeout.called).to.be.false;
    });

    it('should have called clearTimeout', () => {
      expect(stubs.superagent.clearTimeout.called).to.be.true;
    });
  });

  describe('post request that is successful', () => {
    let result;
    let returnData = {body: {test: 'something', test2: 'something else'}};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      stubs.superagent.end = stub().yields(null, returnData);
      let resource = new ResourceAction(url, {}, {method: 'POST'});
      result = resource.makeRequest();
    });

    it('should have called end', () => {
      expect(stubs.superagent.end.called).to.be.true;
    });

    it('should have resolved promise', (done) => {
      result.then(function (res) {
        expect(res).to.equal(returnData.body);
        done();
      })
      .catch(done);
    });
  });

  describe('post request with error', () => {
    let result;
    let errorData = {message: 'Some error'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      stubs.superagent.end = stub().yields(errorData, {});
      let resource = new ResourceAction(url, {}, {method: 'POST'});
      result = resource.makeRequest();
    });

    it('should have called end', () => {
      expect(stubs.superagent.end.called).to.be.true;
    });

    it('should have rejected promise', (done) => {
      result
          .then(done)
          .catch(function (err) {
            expect(err).to.equal(errorData);
            done();
          });
    });
  });

  describe('post with request transform', () => {
    let result;
    let transReq = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST', transformRequest: [(req) => transReq]});
      result = resource.makeRequest(null, {data: 1});
    });

    it('should have transformed request', () => {
      expect(stubs.superagent.send.calledWith(transReq)).to.be.true;
    });
  });

  describe('post with respose transform', () => {
    let result;
    let transResp = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      stubs.superagent.end = stub().yields(null, {body: {myData: 1}});
      let resource = new ResourceAction(url, {}, {method: 'POST', transformResponse: [(resp) => transResp]});
      result = resource.makeRequest();
    });

    it('should have transformed response', (done) => {
      result.then(function (res) {
        expect(res).to.equal(transResp);
        done();
      }).catch(done);
    });
  });

  describe('request with withCredentials', () => {
    let result;
    let headers = {'Content-Type': 'application/json'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'POST', withCredentials: true});
      result = resource.makeRequest();
    });

    it('should have called withCredentials', () => {
      expect(stubs.superagent.withCredentials.called).to.be.true;
    });

  });

  describe('get request with built in cache', () => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {result: 'data'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'GET', cache: true});
      cacheStub.get.callsArgWith(1, null, mockCachedResponse);
      result = resource.makeRequest(null, queryData);
    });

    it('should have returned cached value', (done) => {
      result.then(function (res) {
        expect(res).to.equal(mockCachedResponse);
        done();
      }).catch(done);
    });

    it('should not have called superagent', () => {
      expect(stubs.superagent.get.called).to.be.false;
    });
  });

  describe('get request with custom cache', () => {
    let result;
    let localCacheStub;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {result: 'data'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      localCacheStub = {
        get: stub(),
        set: stub()
      };
      let resource = new ResourceAction(url, {}, {method: 'GET', cache: localCacheStub});
      localCacheStub.get.callsArgWith(1, null, mockCachedResponse);
      result = resource.makeRequest(null, queryData);
    });

    it('should have returned cached value', (done) => {
      result.then(function (res) {
        expect(res).to.equal(mockCachedResponse);
        done();
      }).catch(done);
    });

    it('should not have called superagent', () => {
      expect(stubs.superagent.get.called).to.be.false;
    });
  });

  describe('get request with built in cache and no data', (done) => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'GET', cache: true});
      cacheStub.get.callsArgWith(1, null, null);
      result = resource.makeRequest(null, queryData);
    });

    it('should have called set', () => {
      result.then(function (res) {
        expect(cacheStub.set.called).to.be.true;
        done();
      }).catch(done);
    });
  });
});
