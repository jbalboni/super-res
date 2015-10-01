import proxyquire from 'proxyquire';

describe('request', ()=>{
  let request;
  let stubs;
  let cacheStub;
  let requestIns;

  beforeEach(() => {
    cacheStub = {
      get: stub(),
      set: stub()
    };

    requestIns = {
      set: stub().returnsThis(),
      send: stub().returnsThis(),
      query: stub().returnsThis(),
      accept: stub().returnsThis(),
      end: stub().returnsThis(),
      clearTimeout: stub().returnsThis(),
      timeout: stub().returnsThis(),
      withCredentials: stub().returnsThis()
    };

    stubs = {
      superagent: stub().returns(requestIns),
      'cache-manager': {
        caching: stub().returns(cacheStub)
      }
    };

    request = proxyquire('../../src/request', stubs);
  });

  function noop() {}

  describe('request with response type', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, noop, {responseType: 'text/plain'});
    });

    it('should have called accept with json', () => {
      expect(requestIns.accept.calledWith('text/plain')).to.be.true;
    });
  });

  describe('request with headers', () => {
    let result;
    let headers = {'Content-Type': 'application/json'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, noop, {headers: headers});
    });

    it('should have called set', () => {
      expect(requestIns.set.calledWith(headers)).to.be.true;
    });
  });

  describe('request with timeout', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, noop, {timeout: 30});
    });

    it('should have called timeout', () => {
      expect(requestIns.timeout.calledWith(30)).to.be.true;
    });
  });

  describe('request without timeout', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, noop);
    });

    it('should not have called timeout', () => {
      expect(requestIns.timeout.called).to.be.false;
    });

    it('should have called clearTimeout', () => {
      expect(requestIns.clearTimeout.called).to.be.true;
    });
  });


  describe('request with withCredentials', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, {}, noop, {withCredentials: true});
    });

    it('should have called withCredentials', () => {
      expect(requestIns.withCredentials.called).to.be.true;
    });

  });

  describe('post request that is successful', () => {
    let result, originalEnd, callback;
    let returnData = {body: {test: 'something', test2: 'something else'}};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      originalEnd = requestIns.end = stub().yields(null, returnData).returnsThis();
      callback = spy();
      result = request.post(url, (...args) => {
        callback(...args);
        done();
      });
    });

    it('should have called end', () => {
      expect(originalEnd.called).to.be.true;
    });

    it('should have resolved callback', () => {
      expect(callback.calledWith(null, returnData)).to.be.true;
    });
  });

  describe('post request with error', () => {
    let result, originalEnd, callback;
    let errorData = {message: 'Some error'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      originalEnd = requestIns.end = stub().yields(errorData, {}).returnsThis();
      callback = spy();
      result = request.post(url, {foo: 'bar'}, (...args) => {
        callback(...args);
        done();
      });
    });

    it('should have called end', () => {
      expect(originalEnd.called).to.be.true;
    });

    it('should have rejected callback', () => {
      expect(callback.calledWith(errorData)).to.be.true;
    });
  });

  describe('get with data', () => {
    let result, sendSpy;
    let transReq = {data: 'something'};

    const url = 'http://example.com/get/';
    beforeEach((done) => {
      sendSpy = spy();
      requestIns.send = function (data) {
        this._data = data;
        sendSpy(data);
        return this;
      };
      requestIns.end = stub().yields(null, {}).returnsThis();
      result = request.get(url, transReq, () => done(), {transformRequest: [function (data, header) {
        this.query(data);
        return null;
      }]});
    });

    it('should have send called', () => {
      expect(sendSpy.calledWith(transReq)).to.be.true;
    });

    it('should have transformed request', () => {
      expect(requestIns.query.calledWith(transReq)).to.be.true;
    });

    it('should have _data cleared', () => {
      expect(result._data).to.be.null;
    });
  });

  describe('post with request transform', () => {
    let result;
    let transReq = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      requestIns.send = function (data) {
        this._data = data;
        return this;
      };
      requestIns.end = stub().yields(null, {}).returnsThis();
      result = request.post(url, {data: 1}, () => done(), {transformRequest: [(req) => transReq]});
    });

    it('should have transformed request', () => {
      expect(result._data).to.equal(transReq);
    });
  });

  describe('post with request error transform', () => {
    let result, catchSpy, returnSpy;
    let req = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      requestIns.send = function (data) {
        this._data = data;
        return this;
      };
      catchSpy = spy();
      returnSpy = spy();
      result = request.post(url, req, (...args) => {
        returnSpy(...args);
        done();
      }, {
        transformRequest: [function (req) {
          throw req;
        }],
        catchRequestError: [function (e) {
          catchSpy(e);
          throw e;
        }]
      });
    });

    it('should have deal error.', () => {
      expect(catchSpy.calledWith(req)).to.be.true;
    });

    it('should have returned error.', () => {
      expect(returnSpy.calledWith(req)).to.be.true;
    });
  });

  describe('post with response transform', () => {
    let result, returnSpy;
    let transResp = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      requestIns.end = stub().yields(null, {body: {myData: 1}});
      returnSpy = spy();
      result = request.post(url, {}, (...args)=>{
        returnSpy(...args);
        done();
      }, {transformResponse: [(resp) => transResp]});
    });

    it('should have transformed response', () => {
      expect(returnSpy.calledWith(null, {body: transResp})).to.be.true;
    });
  });

  describe('post with response transform(error occurred)', () => {
    let result, returnSpy;
    let transResp = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      requestIns.end = stub().yields(null, {body: {myData: 1}});
      returnSpy = spy();
      result = request.post(url, {}, (...args)=>{
        returnSpy(...args);
        done();
      }, {transformResponse: [(resp) => {
        throw transResp;
      }]});
    });

    it('should have returned error', () => {
      expect(returnSpy.calledWith(transResp)).to.be.true;
    });
  });

  describe('post with response error transform', () => {
    let result, returnSpy;
    let transResp = {data: 'something'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      requestIns.end = stub().yields({body: {myData: 1}});
      returnSpy = spy();
      result = request.post(url, {}, (...args) => {
        returnSpy(...args);
        done();
      }, {catchResponseError: [(err) => transResp]});
    });

    it('should have transformed response', () => {
      expect(returnSpy.calledWith(transResp)).to.be.true;
    });
  });


  describe('post request with built in cache', () => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {result: 'data'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      requestIns.url = url;
      requestIns._query = {};
      requestIns._data = queryData;
      requestIns.end = stub().yields(null, {body: mockCachedResponse});
      result = request.post(url, queryData, () => {
        done();
      }, {cache: true});
    });

    it('should have called superagent', () => {
      expect(stubs.superagent.calledWith('POST', url)).to.be.true;
    });

    it('should have sent data', () => {
      expect(requestIns.send.calledWith(queryData)).to.be.true;
    });

    it('should have returned cached value', () => {
      expect(cacheStub.set.calledWith(`${url}_{}_${JSON.stringify(queryData)}`, {body: mockCachedResponse})).to.be.true;
    });

  });

  describe('get request with built in cache', () => {
    let result, originalEnd, resultSpy;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {result: 'data'};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      originalEnd = requestIns.end;
      requestIns.method = 'GET';
      cacheStub.get.callsArgWith(1, null, {body: mockCachedResponse});
      resultSpy = spy();

      result = request.get(url, null, null, {cache: true});
      result.query(queryData);
      result.end((err, res) => {
        resultSpy(res);
        done();
      });
    });

    it('should have returned cached value', () => {
      expect(resultSpy.calledWith({body: mockCachedResponse})).to.be.true;
    });

    it('should not have called superagent original request', () => {
      expect(originalEnd.called).to.be.false;
    });
  });

  describe('get request with custom cache', () => {
    let result, originalEnd, resultSpy;
    let localCacheStub;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {body: {result: 'data'}};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      localCacheStub = {
        get: stub(),
        set: stub()
      };
      originalEnd = requestIns.end;
      requestIns.method = 'GET';
      localCacheStub.get.callsArgWith(1, null, mockCachedResponse);
      resultSpy = spy();
      result = request.get(url, null, null, {cache: localCacheStub});
      result.query(queryData);
      result.end((err, res) => {
        resultSpy(res);
        done();
      });
    });

    it('should have returned cached value', () => {
      expect(resultSpy.calledWith(mockCachedResponse)).to.be.true;
    });

    it('should not have called superagent original request', () => {
      expect(originalEnd.called).to.be.false;
    });
  });

  describe('get request with built in cache and no data', (done) => {
    let result, originalEnd, resultSpy;
    let queryData = {test: 'something', test2: 'something else'};
    let mockCachedResponse = {body: {result: 'data'}};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      originalEnd = requestIns.end;
      originalEnd.yields(null, mockCachedResponse);
      requestIns.method = 'GET';
      requestIns.url = url;
      requestIns._query = queryData;
      requestIns._data = {};
      cacheStub.get.callsArgWith(1, null, null);
      resultSpy = spy();

      result = request.get(url, null, null, {cache: true});
      result.query(queryData);
      result.end((err, res) => {
        resultSpy(res);
        done();
      });
    });

    it('should have returned cached value', () => {
      expect(resultSpy.calledWith(mockCachedResponse)).to.be.true;
    });

    it('should have called superagent original request', () => {
      expect(originalEnd.called).to.be.true;
    });

    it('should have called set', () => {
      expect(cacheStub.set.calledWith(`${url}_${JSON.stringify(queryData)}_{}`, mockCachedResponse)).to.be.true;
    });
  });

});