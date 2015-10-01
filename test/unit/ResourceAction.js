import proxyquire from 'proxyquire';
import Q from 'q';
import Route from 'route-parser';

describe('ResourceAction', () => {
  let ResourceAction;
  let stubs;
  let request;

  beforeEach(() => {
    stubs = {
      './request.js': {
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
      }
    };

    ResourceAction = proxyquire('../../src/ResourceAction', stubs);
    request = stubs['./request.js'];
  });

  describe('get request with no data', () => {
    let result, returnSpy;

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      request.end = stub().yields(null, {body: {foo: 'bar'}}).returnsThis();
      returnSpy = spy();
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest();
      result.then((...args)=> {
        returnSpy(...args);
        done();
      })
    });

    it('should have called get with url', () => {
      expect(request.get.calledWith(url)).to.be.true;
    });
    it('should have called end', () => {
      expect(request.end.called).to.be.true;
    });
    it('should return body', () => {
      expect(returnSpy.calledWith({foo: 'bar'})).to.be.true;
    })
  });

  describe('get request with no data failed', () => {
    let result, returnSpy;

    const url = 'http://example.com/posts/';
    beforeEach((done) => {
      request.end = stub().yields({msg: 'Errors'}).returnsThis();
      returnSpy = spy();
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest();
      result.catch((...args)=> {
        returnSpy(...args);
        done();
      })
    });

    it('should have called get with url', () => {
      expect(request.get.calledWith(url)).to.be.true;
    });
    it('should have called end', () => {
      expect(request.end.called).to.be.true;
    });
    it('should return body', () => {
      expect(returnSpy.calledWith({msg: 'Errors'})).to.be.true;
    })
  });

  describe('get request with data', () => {
    let result, resource;
    let queryData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest(null, queryData);
    });

    it('should have a request preprocess hook', () => {
      expect(resource.config.transformRequest).to.have.length(1);
      expect(resource.config.transformRequest[0].name).to.equal('moveDataToParam');
    });

  });

  describe('get request with params and data', () => {
    let result;
    let queryData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:someParam';
    beforeEach(() => {
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest({someParam: 'testing', foo: 'bar'}, queryData);
    });

    it('should have replaced the url token', () => {
      expect(request.get.calledWith('http://example.com/posts/testing')).to.be.true;
    });

    it('should have called query', () => {
      expect(request.query.calledWith({foo: 'bar'})).to.be.true;
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
      expect(request.post.calledWith(url)).to.be.true;
    });
    it('should have called send', () => {
      expect(request.send.calledWith(postData)).to.be.true;
    });
    it('should not have called query', () => {
      expect(request.query.called).to.be.false;
    });
  });

  describe('post request with custom default params and data', () => {
    let result;
    let postData = {test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:id';
    beforeEach(() => {
      let resource = new ResourceAction(url, {id: 'something'}, {method: 'POST'});
      result = resource.makeRequest(postData);
    });

    it('should have called post with url which is picked from data.', () => {
      expect(request.post.calledWith('http://example.com/posts/something')).to.be.true;
    });
    it('should have called send', () => {
      expect(request.send.calledWith(postData)).to.be.true;
    });
    it('should not have called query', () => {
      expect(request.query.called).to.be.false;
    });
  });

  describe('post request with @ params and data', () => {
    let result;
    let postData = {_id: 'hashcode', test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:id';
    beforeEach(() => {
      let resource = new ResourceAction(url, {id: '@_id'}, {method: 'POST'});
      result = resource.makeRequest(postData);
    });

    it('should have called post with url which is picked from data.', () => {
      expect(request.post.calledWith('http://example.com/posts/hashcode')).to.be.true;
    });
    it('should have called send', () => {
      expect(request.send.calledWith(postData)).to.be.true;
    });
    it('should not have called query', () => {
      expect(request.query.called).to.be.false;
    });
  });

  describe('post request with factory params and data', () => {
    let result;
    let postData = {_id:'hashcode', test: 'something', test2: 'something else'};

    const url = 'http://example.com/posts/:id';
    beforeEach(() => {
      let resource = new ResourceAction(url, {id: () => 'foo'}, {method: 'POST'});
      result = resource.makeRequest(postData);
    });

    it('should have called post with url', () => {
      expect(request.post.calledWith('http://example.com/posts/foo')).to.be.true;
    });
    it('should have called send', () => {
      expect(request.send.calledWith(postData)).to.be.true;
    });
    it('should not have called query', () => {
      expect(request.query.called).to.be.false;
    });
  });

});
