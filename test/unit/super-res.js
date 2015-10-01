import proxyquire from 'proxyquire';
import Q from 'q';

describe('resource: ', () => {
  let actionStub;
  let superRes;

  beforeEach(() => {
    actionStub = {
      makeRequest: stub()
    };

    let stubs = {
      './ResourceAction.js': function () {
        return actionStub;
      }
    };
    superRes = proxyquire('../../src/super-res', stubs);

  });

  describe('Default actions are defined', () => {
    let resource;
    beforeEach(() => {
      resource = superRes.resource('http://example.com/posts/:id');
    });

    it('should have get', () => {
      expect(resource.get).to.be.a('function');
    });
    it('should have save', () => {
      expect(resource.save).to.be.a('function');
    });
    it('should have put', () => {
      expect(resource.put).to.be.a('function');
    });
    it('should have query', () => {
      expect(resource.query).to.be.a('function');
    });
    it('should have delete', () => {
      expect(resource.delete).to.be.a('function');
    });
    it('should have remove', () => {
      expect(resource.remove).to.be.a('function');
    });

  });
  describe('Custom action is defined', () => {
    let resource;
    beforeEach(() => {
      resource = superRes.resource('http://example.com/posts/:id', null, {
        myFunction: { method: 'GET' }
      });
      resource.myFunction();
    });

    it('should have myFunction', () => {
      expect(resource.myFunction).to.be.a('function');
      expect(actionStub.makeRequest.called).to.be.true;
    });

  });

  describe('Call promiseWrapper with successful request', () => {
    let resource;
    let qStub;
    beforeEach(() => {
      qStub = spy();
      resource = superRes.promiseWrapper(qStub)(superRes.resource('http://example.com/posts/:id'));
      actionStub.makeRequest.returns(Q.when({test: 1}));
      resource.get({id: 1});
    });

    it('should wrap each action in a promise', () => {
      expect(qStub.calledOnce).to.be.true;
    });

  });

  describe('Call promiseWrapper with failed request', () => {
    let resource;
    let promise;

    beforeEach(() => {
      resource = superRes.promiseWrapper(Q)(superRes.resource('http://example.com/posts/:id'));
      actionStub.makeRequest.returns(Q.reject({test: 1}));
      promise = resource.get({id: 1});
    });

    it('should return a rejected promise', (done) => {
      promise.then((res) => {
        expect.fail();
        done();
      }, () => {
        done();
      });
    })

  });
});
