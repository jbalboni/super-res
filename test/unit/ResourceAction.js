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
        send: stubFunction,
        query: stubFunction,
        accept: stubFunction,
        end: stubFunction,
        clearTimeout: stubFunction
      }
    };

    ResourceAction = proxyquire('../../src/ResourceAction', stubs);
  });

  describe('get request with no data', () => {
    let result;
    let getSpy;
    let endSpy;

    const url = 'http://example.com/posts/';
    beforeEach(() => {
      spy(stubs.superagent, 'get');
      spy(stubs.superagent, 'end');
      spy(stubs.superagent, 'query');
      spy(stubs.superagent, 'send');
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
});
