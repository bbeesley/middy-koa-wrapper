import type { IncomingMessage } from 'node:http';
import type { Schema } from 'joi';
import type { MiddlewareObject } from 'middy';
import type {
  Middleware,
  Next,
  Request,
  DefaultContext,
  ParameterizedContext,
  DefaultState,
} from 'koa';
import type {
  Context as LambdaContext,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

export type Context = {
  request: Request & { body?: string };
  req: IncomingMessage & { body?: string };
  inputSchema?: Schema;
} & ParameterizedContext<DefaultState, DefaultContext, string>;

/**
 * Creates a temporary handler object to use in middy middleware
 * @private
 * @param {Object} ctx The Koa context object
 * @returns {Object}  A Lambda style handler object
 */
const mapCtxToHandler = (
  ctx: Context,
): {
  event: APIGatewayProxyEvent & Record<string, any>;
  response: APIGatewayProxyResult;
  context: LambdaContext;
  error: any;
  callback: any;
} => ({
  event: {
    path: ctx.path,
    headers: Object.fromEntries(
      Object.entries(ctx.headers).map(([k, v]) => [
        k,
        Array.isArray(v) ? v[0] : v,
      ]),
    ),
    multiValueHeaders: Object.fromEntries(
      (Object.entries(ctx.headers) as Array<[string, string]>).map(
        ([key, value]) => [key, [value]],
      ),
    ),
    multiValueQueryStringParameters: Object.fromEntries(
      (Object.entries(ctx.query) as Array<[string, string]>).map(
        ([key, value]) => [key, [value]],
      ),
    ),
    httpMethod: ctx.method,
    queryStringParameters: Object.fromEntries(
      Object.entries(ctx.query).map(([k, v]) => [
        k,
        Array.isArray(v) ? v[0] : v,
      ]),
    ),
    data: (ctx.is('json')
      ? JSON.parse(ctx.request.body ?? '{}')
      : ctx.request.body) as Record<string, any>,
    inputSchema: ctx.inputSchema,
    body: ctx.req.body ?? null,
    isBase64Encoded: false,
    pathParameters: { proxy: ctx.path },
    stageVariables: {},
    resource: '',
    requestContext: {
      authorizer: {},
      accountId: process.env.AWS_PROFILE ?? '',
      apiId: process.env.npm_package_name ?? '',
      protocol: ctx.protocol,
      resourceId: process.env.npm_package_name ?? '',
      httpMethod: ctx.method,
      stage: process.env.STAGE ?? 'prod',
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
    functionName: process.env.npm_package_name ?? '',
    memoryLimitInMB: '1024', // eslint-disable-line @typescript-eslint/naming-convention
    logGroupName: `/aws/lambda/${process.env.npm_package_name ?? ''}`,
    logStreamName: '',
    invokedFunctionArn: '',
    awsRequestId: ctx.get('x-correlation-id'),
    getRemainingTimeInMillis: () => Date.now(),
    done() {},
    fail() {},
    succeed() {},
  },
  error: {},
  callback() {},
  response: {
    statusCode: ctx.status,
    body: ctx.body ?? '',
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
    response = {
      statusCode: 0,
      body: '{}',
    },
  }: {
    event: APIGatewayProxyEvent & Record<string, any>;
    response?: APIGatewayProxyResult;
    context: LambdaContext;
    error: any;
    callback: any;
  },
  ctx: Context,
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
  middyware: MiddlewareObject<any, any>,
  name = 'middyware',
): Middleware<DefaultState, DefaultContext & { inputSchema?: Schema }> {
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
    } catch (error) {
      if (onError) {
        const handler = mapCtxToHandler(ctx);
        handler.error = error;
        await onError(handler, () => {});
        handleResponse(handler, ctx);
      } else {
        throw error;
      }
    }
  };

  Object.defineProperty(middleware, 'name', { value: name });
  return middleware;
}
