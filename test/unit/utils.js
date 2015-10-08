import * as utils from '../../src/utils.js'

describe('utils', () => {

  describe('assignOptions', () => {
    it('should cover with null', () => {
      let a = {
          sub: 'foo'
        },
        b = {
          sub: null
        };

      let c = utils.assignOptions(a, b);

      expect(c).to.deep.equal({sub: null});

    });

    it('should merge two objects', () => {
      let a = {
          sub: {
            foo: 'foo'
          }
        },
        b = {
          sub: {
            bar: 'bar'
          }
        };

      let c = utils.assignOptions(a, b);

      expect(c).to.deep.equal({sub: {foo: 'foo', bar: 'bar'}});

    });

    it('should concat two options', () => {
      let a = {
        sub: ['foo']
      },
      b = {
        sub: ['bar']
      };

      let c = utils.assignOptions(a, b);

      expect(c).to.deep.equal({sub: ['foo', 'bar']});

    });

    it('should cover', () => {
      let a = {
          sub: {
            foo: 'foo'
          }
        },
        b = {
          sub: ['bar']
        };

      let c = utils.assignOptions(a, b);

      expect(c).to.deep.equal({sub: ['bar']});

      a = {
        sub: ['bar']
      };
      b = {
        sub: {
          foo: 'foo'
        }
      };

      c = utils.assignOptions(a, b);

      expect(c).to.deep.equal({sub: {foo: 'foo'}});

    });

  });

  describe('parseUrl', () => {
    let parseUrl = utils.parseUrl;

    it('should throw error with "hasOwnProperty"', () => {
      expect(() => parseUrl('http://foo.bar/baz:hasOwnProperty', {f: 'aaa', b: 'bbb'})).to.throw(Error);
    });

    it('should return url and query parameters', () => {
      expect(parseUrl('http://foo.bar/baz:f', {f: 'aaa', b: 'bbb'})).to.deep.equal({
        url: 'http://foo.bar/bazaaa',
        query: {b: 'bbb'}
      });

    });

    it('should return url with dots', () => {
      expect(parseUrl('http://foo.bar/:baz.:qux', {baz: 'aaa', qux: 'bbb'})).to.deep.equal({
        url: 'http://foo.bar/aaa.bbb',
        query: undefined
      });

    });

    it('should return url with missing parameters', () => {
      expect(parseUrl('http://foo.bar/:baz.:qux', {qux: 'bbb'})).to.deep.equal({
        url: 'http://foo.bar.bbb',
        query: undefined
      });
      expect(parseUrl('http://foo.bar/:baz.:qux/else', {baz: 'bbb'})).to.deep.equal({
        url: 'http://foo.bar/bbb./else',
        query: undefined
      });
      expect(parseUrl('http://foo.bar/:baz/:qux/else')).to.deep.equal({
        url: 'http://foo.bar/else',
        query: undefined
      });
    });

    it('should transform uri components', () => {
      expect(parseUrl('http://foo.bar/:baz/:qux', {baz: '@:$,', qux: ' &=+'})).to.deep.equal({
        url: 'http://foo.bar/@:$,/%20&=+',
        query: undefined
      });

    });

  });
});