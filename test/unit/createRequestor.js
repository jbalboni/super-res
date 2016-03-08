import proxyquire from 'proxyquire';
import Q from 'q';

describe('createRequestor', () => {
  let ResourceAction;
  let configStub;
  let makeStub;
  let cacheStub;

  beforeEach(() => {
    configStub = stub();
    makeStub = stub();
    cacheStub = {
      get: stub(),
      set: stub()
    };
    stubs = {
      './superagentAdapter.js': {
        configureRequest: configStub,
        makeRequest: makeStub
      },
      'cache-manager': {
        caching: stub().returns(cacheStub)
      }
    };

    createRequestor = proxyquire('../../src/createRequestor', stubs);
  });

  describe('post with request transform', () => {
    let result;
    let transReq = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      const makeRequest = createRequestor(url, null, {
        transformRequest: [() => transReq],
        method: 'POST'
      });
      result = makeRequest({});
    });

    it('should have transformed request', () => {
      var transformFunction = configStub.firstCall.args[2];
      expect(transformFunction({})).to.equal(transReq);
    });
  });

  describe('post with default params', () => {
    let result;
    let transReq = {data: 'something'};
    let defaultParams = {defParam: 'test'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      const makeRequest = createRequestor(url + ':defParam', defaultParams, {
        transformRequest: [() => transReq],
        method: 'POST'
      });
      result = makeRequest({});
    });

    it('should have request with default param', () => {
      var requestedUrl = configStub.firstCall.args[1];
      expect(requestedUrl).to.equal(url + defaultParams.defParam);
    });
  });

  describe('post with derived param', () => {
    let result;
    let transReq = {data: 'something'};
    let defaultParams = {defParam: '@myData'};
    let requestData = {myData: 'test'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      const makeRequest = createRequestor(url + ':defParam', defaultParams, {
        transformRequest: [() => transReq],
        method: 'POST'
      });
      result = makeRequest(requestData);
    });

    it('should have request with default param', () => {
      var requestedUrl = configStub.firstCall.args[1];
      expect(requestedUrl).to.equal(url + requestData.myData);
    });
  });

  describe('post with function param', () => {
    let result;
    let transReq = {data: 'something'};
    let defaultParams = {defParam: () => 'test'};
    let requestData = {};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      const makeRequest = createRequestor(url + ':defParam', defaultParams, {
        transformRequest: [() => transReq],
        method: 'POST'
      });
      result = makeRequest(requestData);
    });

    it('should have request with default param', () => {
      var requestedUrl = configStub.firstCall.args[1];
      expect(requestedUrl).to.equal(url + 'test');
    });
  });

  describe('post with response transform', () => {
    let result;
    let transResp = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      makeStub.returns(Q.when({}));
      const makeRequest = createRequestor(url, null, {
        transformResponse: [() => transResp],
        method: 'POST'
      });
      result = makeRequest({});
    });

    it('should have transformed response', (done) => {
      result.then(function(res) {
        expect(res).to.equal(transResp);
        done();
      }).catch(done);
    });
  });

  describe('get request with built in cache', () => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {result: 'data'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      makeStub.returns(Q.when({}));
      const makeRequest = createRequestor(url, null, {
        cache: true,
        method: 'GET'
      });
      cacheStub.get.callsArgWith(1, null, mockCachedResponse);
      result = makeRequest(null, queryData);
    });

    it('should have returned cached value', (done) => {
      result.then(function(res) {
        expect(res).to.equal(mockCachedResponse);
        done();
      }).catch(done);
    });

    it('should not have called superagent', () => {
      expect(makeStub.called).to.be.false;
    });
  });

  describe('get request with custom cache', () => {
    let result;
    let localCacheStub;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {result: 'data'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      makeStub.returns(Q.when({}));
      localCacheStub = {
        get: stub(),
        set: stub()
      };
      const makeRequest = createRequestor(url, null, {
        cache: localCacheStub,
        method: 'GET'
      });
      localCacheStub.get.callsArgWith(1, null, mockCachedResponse);
      result = makeRequest(null, queryData);
    });

    it('should have returned cached value', (done) => {
      result.then(function(res) {
        expect(res).to.equal(mockCachedResponse);
        done();
      }).catch(done);
    });

    it('should not have called superagent', () => {
      expect(makeStub.called).to.be.false;
    });
  });

  describe('get request with built in cache and no data', (done) => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      makeStub.returns(Q.when({}));
      const makeRequest = createRequestor(url, null, {
        cache: true,
        method: 'GET'
      });
      cacheStub.get.callsArgWith(1, null, null);
      result = makeRequest(null, queryData);
    });

    it('should have called set', () => {
      result.then(function(res) {
        expect(cacheStub.set.called).to.be.true;
        done();
      }).catch(done);
    });
  });
});
