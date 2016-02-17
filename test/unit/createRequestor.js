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

  //describe('post with request transform', () => {
  //  let result;
  //  let transReq = {data: 'something'};
  //
  //  const url = 'http://example.com/posts/';
  //  beforeEach(() => {
  //    const makeRequest = createRequestor();
  //    result = makeRequest();
  //  });
  //
  //  it('should have transformed request', () => {
  //    expect(stubs.superagent.send.calledWith(transReq)).to.be.true;
  //  });
  //});
  //
  //describe('post with respose transform', () => {
  //  let result;
  //  let transResp = {data: 'something'};
  //
  //  const url = 'http://example.com/posts/';
  //  beforeEach(() => {
  //    stubs.superagent.end = stub().yields(null, {body: {myData: 1}});
  //    let resource = new ResourceAction(url, {}, {method: 'POST', transformResponse: [(resp) => transResp]});
  //    result = resource.makeRequest();
  //  });
  //
  //  it('should have transformed response', (done) => {
  //    result.then(function (res) {
  //      expect(res).to.equal(transResp);
  //      done();
  //    }).catch(done);
  //  });
  //});
  //
  //describe('get request with built in cache', () => {
  //  let result;
  //  let queryData = {test: 'something', test2: 'something else'};
  //  let mockCachedResponse = {result: 'data'};
  //
  //  const url = 'http://example.com/posts/';
  //  beforeEach(() => {
  //    let resource = new ResourceAction(url, {}, {method: 'GET', cache: true});
  //    cacheStub.get.callsArgWith(1, null, mockCachedResponse);
  //    result = resource.makeRequest(null, queryData);
  //  });
  //
  //  it('should have returned cached value', (done) => {
  //    result.then(function (res) {
  //      expect(res).to.equal(mockCachedResponse);
  //      done();
  //    }).catch(done);
  //  });
  //
  //  it('should not have called superagent', () => {
  //    expect(stubs.superagent.get.called).to.be.false;
  //  });
  //});
  //
  //describe('get request with custom cache', () => {
  //  let result;
  //  let localCacheStub;
  //  let queryData = {test: 'something', test2: 'something else'};
  //  let mockCachedResponse = {result: 'data'};
  //
  //  const url = 'http://example.com/posts/';
  //  beforeEach(() => {
  //    localCacheStub = {
  //      get: stub(),
  //      set: stub()
  //    };
  //    let resource = new ResourceAction(url, {}, {method: 'GET', cache: localCacheStub});
  //    localCacheStub.get.callsArgWith(1, null, mockCachedResponse);
  //    result = resource.makeRequest(null, queryData);
  //  });
  //
  //  it('should have returned cached value', (done) => {
  //    result.then(function (res) {
  //      expect(res).to.equal(mockCachedResponse);
  //      done();
  //    }).catch(done);
  //  });
  //
  //  it('should not have called superagent', () => {
  //    expect(stubs.superagent.get.called).to.be.false;
  //  });
  //});
  //
  //describe('get request with built in cache and no data', (done) => {
  //  let result;
  //  let queryData = {test: 'something', test2: 'something else'};
  //
  //  const url = 'http://example.com/posts/';
  //  beforeEach(() => {
  //    let resource = new ResourceAction(url, {}, {method: 'GET', cache: true});
  //    cacheStub.get.callsArgWith(1, null, null);
  //    result = resource.makeRequest(null, queryData);
  //  });
  //
  //  it('should have called set', () => {
  //    result.then(function (res) {
  //      expect(cacheStub.set.called).to.be.true;
  //      done();
  //    }).catch(done);
  //  });
  //});
});
