import wrap from './index';

const ctx = {
  is: jest.fn(() => false),
  request: {
    body: '{"body": "foo"}',
  },
  req: {
    body: '{"body": "foo"}',
  },
  response: {},
  path: '/foo',
  headers: { foo: 'foo' },
  method: 'POST',
  query: { bar: 'bar', baz: 'baz' },
  get: (arg) => arg,
};

const __mocks = {
  before: jest.fn(),
  after: jest.fn(),
  onError: jest.fn(),
};

const middyware = () => ({
  before(handler, next) {
    __mocks.before(handler);
    return next();
  },
  after(handler, next) {
    __mocks.after(handler);
    return next();
  },
  onError(handler, next) {
    __mocks.onError(handler);
    return next();
  },
});

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
      const error = new Error('test error');
      await wrapped(ctx, async () => {
        expect(__mocks.onError).not.toHaveBeenCalled();
        throw error;
      });
      expect(__mocks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            path: ctx.path,
            headers: ctx.headers,
            httpMethod: ctx.method,
            queryStringParameters: ctx.query,
            data: ctx.request.body,
          }),
          error,
        }),
      );
    });
    it('gets passed a fake event', async () => {
      const wrapped = wrap(middyware());
      await wrapped(ctx, async () => {});
      expect(__mocks.before).toBeCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            path: ctx.path,
            headers: ctx.headers,
            httpMethod: ctx.method,
            queryStringParameters: ctx.query,
            data: ctx.request.body,
          }),
        }),
      );
    });
    it('gets a parsed body if content type is json', async () => {
      const wrapped = wrap(middyware());
      const context = {
        ...ctx,
        is: () => 'json',
      };
      await wrapped(context, async () => {});
      expect(__mocks.before).toBeCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            path: ctx.path,
            headers: ctx.headers,
            httpMethod: ctx.method,
            queryStringParameters: ctx.query,
            data: { body: 'foo' },
          }),
        }),
      );
    });
  });
});
