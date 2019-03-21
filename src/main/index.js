/**
 * Creates a temporary handler object to use in middy middleware
 * @param {Object} ctx The Koa context object
 * @returns {Object}  A Lambda style handler object
 */
const mapCtxToHandler = (ctx, transferResponse) => ({
  event: {
    path: ctx.path,
    headers: ctx.headers,
    httpMethod: ctx.method,
    queryStringParameters: ctx.query,
    data: ctx.is('json') ? JSON.parse(ctx.request.body) : ctx.request.body,
    inputSchema: ctx.inputSchema
  },
  response:
    transferResponse && (ctx.body || ctx.status)
      ? {
          statusCode: ctx.status,
          body: ctx.body
        }
      : undefined
});

/**
 * If handler.response has been set, we copy those props onto ctx
 * @param {Object} handler The temporary lamnda handler object
 * @param {Object} ctx The Koa context object
 */
const handleResponse = ({ response = {} }, ctx) => {
  if (response.statusCode >= 400) {
    ctx.throw(response.statusCode, response.body);
  }
  if (response.statusCode) {
    ctx.status = response.statusCode;
  }
  if (response.body) {
    ctx.body = response.body;
  }
};

/**
 * Main wrapper fn to convert middy middleware to koa middleware
 * @param {Object} middyware The middy middleware
 * @param {Function} [middyware.before] The middy before hook
 * @param {Function} [middyware.after] The middy after hook
 * @param {Function} [middyware.onError] The middy onError hook
 * @returns {Object}  async koa middleware object
 */
const wrap = middyware => {
  const { before, after, onError } = middyware;
  return async (ctx, next) => {
    try {
      if (before) {
        const handler = mapCtxToHandler(ctx);
        await before(handler, next);
        handleResponse(handler, ctx);
      } else {
        await next();
      }
      if (after) {
        const handler = mapCtxToHandler(ctx, true);
        await after(handler, () => {});
        handleResponse(handler, ctx);
      }
    } catch (err) {
      if (onError) {
        const handler = mapCtxToHandler(ctx, true);
        handler.error = err;
        await onError(handler, () => {});
        handleResponse(handler, ctx);
      } else {
        throw err;
      }
    }
  };
};

module.exports = wrap;
