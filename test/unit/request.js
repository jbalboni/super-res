import proxyquire from 'proxyquire';

describe('request', ()=>{
  let request;
  let stubs;

  beforeEach(() => {
    let r = {
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
      request: r,
      superagent: stub().returns(r)
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
      expect(stubs.request.accept.calledWith('text/plain')).to.be.true;
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
      expect(stubs.request.set.calledWith(headers)).to.be.true;
    });
  });

  describe('request with timeout', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, noop, {timeout: 30});
    });

    it('should have called timeout', () => {
      expect(stubs.request.timeout.calledWith(30)).to.be.true;
    });
  });

  describe('request without timeout', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, noop);
    });

    it('should not have called timeout', () => {
      expect(stubs.request.timeout.called).to.be.false;
    });

    it('should have called clearTimeout', () => {
      expect(stubs.request.clearTimeout.called).to.be.true;
    });
  });


  describe('request with withCredentials', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = request.post(url, {}, noop, {withCredentials: true});
    });

    it('should have called withCredentials', () => {
      expect(stubs.request.withCredentials.called).to.be.true;
    });

  });

  describe('post request that is successful', () => {
    let result, originalEnd, callback;
    let returnData = {body: {test: 'something', test2: 'something else'}};

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      originalEnd = stubs.request.end = stub().yields(null, returnData).returnsThis();
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
      originalEnd = stubs.request.end = stub().yields(errorData, {}).returnsThis();
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
      stubs.request.send = function (data) {
        this._data = data;
        sendSpy(data);
        return this;
      };
      stubs.request.end = stub().yields(null, {}).returnsThis();
      result = request.get(url, transReq, () => done(), {transformRequest: [function (data, header) {
        this.query(data);
        return null;
      }]});
    });

    it('should have send called', () => {
      expect(sendSpy.calledWith(transReq)).to.be.true;
    });

    it('should have transformed request', () => {
      expect(stubs.request.query.calledWith(transReq)).to.be.true;
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
      stubs.request.send = function (data) {
        this._data = data;
        return this;
      };
      stubs.request.end = stub().yields(null, {}).returnsThis();
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
      stubs.request.send = function (data) {
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
      stubs.request.end = stub().yields(null, {body: {myData: 1}});
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
      stubs.request.end = stub().yields(null, {body: {myData: 1}});
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
      stubs.request.end = stub().yields({body: {myData: 1}});
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

});