import proxyquire from 'proxyquire';
var stubFunction = function () { return stubs.superagent; };
var stubs = {
  superagent: {
    get: stubFunction,
    put: stubFunction,
    set: stubFunction,
    accept: stubFunction,
    end: stubFunction
  }
};
let superRes = proxyquire('../../src/super-res', stubs);

import Q from 'q';

describe('superRes', () => {
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
    });

    it('should have get', () => {
      expect(resource.myFunction).to.be.a('function');
    });

  });
});
