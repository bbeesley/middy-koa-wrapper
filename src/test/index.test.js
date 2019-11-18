const { __mocks, middyware } = require('./middyware');
const wrap = require('../main');

const ctx = {
  is: jest.fn(() => false),
  request: {
    body: '{"body": "foo"}',
  },
  response: {},
  path: '/foo',
  headers: { foo: 'foo' },
  method: 'POST',
  query: { bar: 'bar', baz: 'baz' },
};

describe('wrap', () => {
  it('returns a single function when passed middy middleware', () => {
    const res = wrap(middyware);
    expect(res).toBeInstanceOf(Function);
  });
  it('correctly names the returned middleware', () => {
    const res = wrap(middyware);
    expect(res.name).toEqual('middyware');
  });
  describe('wrapped middleware', () => {
    it('calls the before hook', async () => {
      const wrapped = wrap(middyware());
      await wrapped(ctx, async () => {
        expect(__mocks.before).toHaveBeenCalled();
        expect(__mocks.after).not.toHaveBeenCalled();
      });
    });
    it('calls the after hook when next resolves', async () => {
      const wrapped = wrap(middyware());
      await wrapped(ctx, async () => {
        expect(__mocks.after).not.toHaveBeenCalled();
      });
      expect(__mocks.after).toHaveBeenCalled();
    });
    it('calls the onError hook if theres an error', async () => {
      const wrapped = wrap(middyware());
      const error = new Error();
      await wrapped(ctx, async () => {
        expect(__mocks.onError).not.toHaveBeenCalled();
        throw error;
      });
      expect(__mocks.onError).toHaveBeenCalledWith({
        event: {
          path: ctx.path,
          headers: ctx.headers,
          httpMethod: ctx.method,
          queryStringParameters: ctx.query,
          data: ctx.request.body,
        },
        error,
      });
    });
    it('gets passed a fake event', async () => {
      const wrapped = wrap(middyware());
      await wrapped(ctx, async () => {});
      expect(__mocks.before).toBeCalledWith({
        event: {
          path: ctx.path,
          headers: ctx.headers,
          httpMethod: ctx.method,
          queryStringParameters: ctx.query,
          data: ctx.request.body,
        },
      });
    });
    it('gets a parsed body if content type is json', async () => {
      const wrapped = wrap(middyware());
      const context = Object.assign({}, ctx, {
        is: () => 'json',
      });
      await wrapped(context, async () => {});
      expect(__mocks.before).toBeCalledWith({
        event: {
          path: ctx.path,
          headers: ctx.headers,
          httpMethod: ctx.method,
          queryStringParameters: ctx.query,
          data: { body: 'foo' },
        },
      });
    });
  });
});
