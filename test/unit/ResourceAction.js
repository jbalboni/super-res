import proxyquire from 'proxyquire';
import Q from 'q';

describe('ResourceAction', () => {
  let ResourceAction;
  let stubs;

  beforeEach(() => {
    var stubFunction = function () { return stubs.superagent; };
    stubs = {
      superagent: {
        get: stubFunction,
        put: stubFunction,
        set: stubFunction,
        accept: stubFunction,
        end: stubFunction,
        clearTimeout: stubFunction
      }
    };

    ResourceAction = proxyquire('../../src/ResourceAction', stubs);
  });

  describe('superagent request is made', () => {
    let result;
    let getSpy;
    let endSpy;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      spy(stubs.superagent, 'get');
      spy(stubs.superagent, 'end');
      let resource = new ResourceAction(url, {}, {method: 'GET'});
      result = resource.makeRequest();
    });

    it('should have called get with url', () => {
      expect(stubs.superagent.get.calledWith(url)).to.be.true;
    });
    it('should have called end', () => {
      expect(stubs.superagent.end.called).to.be.true;
    });
  });
});
