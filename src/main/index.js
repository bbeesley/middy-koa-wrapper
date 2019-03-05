const wrap = (middyware) => {
  const { before, after } = middyware;
  return async (ctx, next) => {
    const handler = {
      event: {
        path: ctx.path,
        headers: ctx.headers,
        httpMethod: ctx.method,
        queryStringParameters: ctx.query,
        data: (ctx.is('json')) ? JSON.parse(ctx.request.body) : ctx.request.body,
      },
    };
    if (before) {
      await before(handler, next);
    } else {
      await next();
    }
    if (after) {
      await after(handler, () => {});
    }
  };
};

module.exports = wrap;
