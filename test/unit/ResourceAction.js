import proxyquire from 'proxyquire';
import Q from 'q';

describe('ResourceAction', () => {
  let ResourceAction;
  let stubs;

  beforeEach(() => {
    var stubFunction = function () { return this; };
    stubs = {
      superagent: {
        get: stub().returnsThis(),
        post:stub().returnsThis(),
        put: stub().returnsThis(),
        set: stub().returnsThis(),
        send: stub().returnsThis(),
        query: stub().returnsThis(),
        accept: stub().returnsThis(),
        end: stub().returnsThis(),
        clearTimeout: stub().returnsThis()
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
});
