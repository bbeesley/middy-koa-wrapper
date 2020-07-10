import { MiddlewareObject } from 'middy';
import { Middleware, Context as KoaContext, Next } from 'koa';
import {
  Context as LambdaContext,
  APIGatewayEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

export interface Context extends KoaContext {
  request: KoaContext['request'] & { body: string };
  req: KoaContext['req'] & { body: string };
}

/**
 * Creates a temporary handler object to use in middy middleware
 * @private
 * @param {Object} ctx The Koa context object
 * @returns {Object}  A Lambda style handler object
 */
const mapCtxToHandler = (
  ctx: Context
): {
  event: APIGatewayEvent & Record<string, any>;
  response: APIGatewayProxyResult;
  context: LambdaContext;
  error: any;
  callback: any;
} => ({
  event: {
    path: ctx.path,
    headers: ctx.headers,
    multiValueHeaders: (Object.entries(ctx.headers) as [
      string,
      string
    ][]).reduce((acc, [key, value]) => ({ ...acc, [key]: [value] }), {}),
    multiValueQueryStringParameters: (Object.entries(ctx.query) as [
      string,
      string
    ][]).reduce((acc, [key, value]) => ({ ...acc, [key]: [value] }), {}),
    httpMethod: ctx.method,
    queryStringParameters: ctx.query,
    data: ctx.is('json') ? JSON.parse(ctx.request.body) : ctx.request.body,
    inputSchema: ctx.inputSchema,
    body: ctx.req.body,
    isBase64Encoded: false,
    pathParameters: { proxy: ctx.path },
    stageVariables: {},
    resource: '',
    requestContext: {
      authorizer: {},
      accountId: process.env.AWS_PROFILE || '',
      apiId: process.env.npm_package_name || '',
      protocol: ctx.protocol,
      resourceId: process.env.npm_package_name || '',
      httpMethod: ctx.method,
      stage: process.env.STAGE || 'prod',
      requestId: ctx.get('x-correlation-id'),
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      path: ctx.path,
      resourcePath: '/{proxy+}',
      identity: {
        apiKey: null,
        apiKeyId: null,
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        accessKey: null,
        sourceIp: ctx.ip,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: ctx.get('user-agent'),
        user: null,
        principalOrgId: null,
      },
    },
  },
  context: {
    callbackWaitsForEmptyEventLoop: true,
    functionVersion: '$LATEST',
    functionName: process.env.npm_package_name || '',
    memoryLimitInMB: '1024',
    logGroupName: `/aws/lambda/${process.env.npm_package_name}`,
    logStreamName: '',
    invokedFunctionArn: '',
    awsRequestId: ctx.get('x-correlation-id'),
    getRemainingTimeInMillis: () => Date.now(),
    done: () => {},
    fail: () => {},
    succeed: () => {},
  },
  error: {},
  callback: () => {},
  response: {
    statusCode: ctx.status,
    body: ctx.body,
  },
});

/**
 * If handler.response has been set, we copy those props onto ctx
 * @private
 * @param {Object} handler The temporary lamnda handler object
 * @param {Object} ctx The Koa context object
 */
const handleResponse = (
  {
    response = {},
  }: {
    event: APIGatewayEvent & Record<string, any>;
    response?: APIGatewayProxyResult | Record<string, any>;
    context: LambdaContext;
    error: any;
    callback: any;
  },
  ctx: Context
) => {
  if (response.statusCode) {
    ctx.status = response.statusCode;
  }
  if (response.body) {
    ctx.body = response.body;
  }
  if (response.statusCode >= 400) {
    ctx.throw(response.statusCode, response.body);
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
export default function wrap(
  middyware: MiddlewareObject<any, any, LambdaContext>,
  name: string = 'middyware'
): Middleware {
  const { before, after, onError } = middyware;
  const middleware = async (ctx: Context, next: Next) => {
    try {
      if (before) {
        const handler = mapCtxToHandler(ctx);
        await before(handler, next);
        const { response, ...handlerNoResponse } = handler;
        handleResponse(handlerNoResponse, ctx);
      } else {
        await next();
      }
      if (after) {
        const handler = mapCtxToHandler(ctx);
        await after(handler, () => {});
        handleResponse(handler, ctx);
      }
    } catch (err) {
      if (onError) {
        const handler = mapCtxToHandler(ctx);
        handler.error = err;
        await onError(handler, () => {});
        handleResponse(handler, ctx);
      } else {
        throw err;
      }
    }
  };
  Object.defineProperty(middleware, 'name', { value: name });
  return middleware;
}
