import proxyquire from 'proxyquire';
import Q from 'q';
import Route from 'route-parser';

describe('superagentAdapter: ', () => {
  let ResourceAction;
  let stubs;
  let cacheStub;
  let plugin;

  beforeEach(() => {
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
        withCredentials: stub().returnsThis(),
        use: stub().returnsThis(),
      }
    };

    adapter = proxyquire('../../src/superagentAdapter', stubs);
  });

  describe('get request with no data', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = adapter.configureRequest({method: 'GET'}, (new Route(url)).reverse(), () => null);
    });

    it('should have called get with url', () => {
      expect(stubs.superagent.get.calledWith(url)).to.be.true;
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
      result = adapter.configureRequest({method: 'GET'}, (new Route(url)).reverse(), () => queryData);
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
      result = adapter.configureRequest({method: 'GET'}, (new Route(url)).reverse({someParam: 'testing'}), () => queryData);
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
      result = adapter.configureRequest({method: 'POST'}, (new Route(url)).reverse(), () => postData);
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

  describe('post request with @ params and data', () => {
    let result;
    let postData = {_id: 'hashcode', test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:id';
    beforeEach(() => {
      result = adapter.configureRequest({method: 'POST'}, (new Route(url)).reverse({id: 'hashcode'}), () => postData);
    });

    it('should have called post with url which is picked from data.', () => {
      expect(stubs.superagent.post.calledWith('http://example.com/posts/hashcode')).to.be.true;
    });
    it('should have called send', () => {
      expect(stubs.superagent.send.calledWith(postData)).to.be.true;
    });
    it('should not have called query', () => {
      expect(stubs.superagent.query.called).to.be.false;
    });
  });

  describe('post request with factory params and data', () => {
    let result;
    let postData = {_id: 'hashcode', test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:id';
    beforeEach(() => {
      result = adapter.configureRequest({method: 'POST'}, (new Route(url)).reverse({id: 'foo'}), () => postData);
    });

    it('should have called post with url', () => {
      expect(stubs.superagent.post.calledWith('http://example.com/posts/foo')).to.be.true;
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
      result = adapter.configureRequest({method: 'POST', responseType: 'json'}, (new Route(url)).reverse(), () => null);
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
      result = adapter.configureRequest({
        method: 'POST',
        responseType: 'json',
        headers: headers
      }, (new Route(url)).reverse(), () => null);
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
      result = adapter.configureRequest({method: 'POST', timeout: 30}, (new Route(url)).reverse(), () => null);
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
      result = adapter.configureRequest({method: 'POST'}, (new Route(url)).reverse(), () => null);
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
      result = adapter.makeRequest(stubs.superagent);
    });

    it('should have called end', () => {
      expect(stubs.superagent.end.called).to.be.true;
    });

    it('should have resolved promise', (done) => {
      result.then(function(res) {
          expect(res.body).to.equal(returnData.body);
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
      result = adapter.makeRequest(stubs.superagent);
    });

    it('should have called end', () => {
      expect(stubs.superagent.end.called).to.be.true;
    });

    it('should have rejected promise', (done) => {
      result
        .then(done)
        .catch(function(err) {
          expect(err).to.equal(errorData);
          done();
        });
    });
  });

  describe('request with withCredentials', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      result = adapter.configureRequest({
        method: 'POST',
        withCredentials: true
      }, (new Route(url)).reverse(), () => null);
    });

    it('should have called withCredentials', () => {
      expect(stubs.superagent.withCredentials.called).to.be.true;
    });

  });

  describe('request with superagent plugin', () => {
    let result;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      plugin = function(){}

      result = adapter.configureRequest({
        method: 'GET',
        plugins: [plugin]
      }, (new Route(url)).reverse(), () => null);
    });

    it('should have called use', () => {
      expect(stubs.superagent.use.called).to.be.true;
      expect(stubs.superagent.use.calledWith(plugin)).to.be.true;
    });

  });
});
