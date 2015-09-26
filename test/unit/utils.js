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

});