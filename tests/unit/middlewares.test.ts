import { describe, test, expect } from 'bun:test';
import { useBody, useParam, useQuery, validatePipe } from '../../lib';
import * as tsafe from 'tsafe';
import { z } from 'zod';
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import { noop } from 'lodash-es';
import { MetaKeys, RouteHandler, Router } from '@litemw/router';
import { MiddlwareMetaKeys } from '../../lib/metadata';

type Context = Koa.ParameterizedContext<
  any,
  Koa.DefaultContext & KoaRouter.IRouterParamContext<any, {}>,
  unknown
>;

describe('Router params', async () => {
  const param1 = useParam('param'),
    param2 = useParam('param', 'paramKey'),
    param3 = useParam(
      'paramStateKey',
      'paramKey',
      validatePipe(z.string().ip()),
    );

  const ctx1 = { params: { param: '1234' } };
  const ctx2 = { params: { paramKey: '10.0.0.0' } };
  const ctx3 = { params: { paramKey: '999.0.00' } };
  const next = noop;

  tsafe.assert(tsafe.is<Context>(ctx1));
  tsafe.assert(tsafe.is<Context>(ctx2));
  tsafe.assert(tsafe.is<Context>(ctx3));
  tsafe.assert(tsafe.is<Koa.Next>(next));

  test('Default params', async () => {
    const res1 = await param1(ctx1, next);
    const res2 = await param1(ctx2, next);
    expect(res1.param).toBe('1234');
    expect(res2.param).toBeUndefined();
  });

  test('Params with custom key', async () => {
    const res3 = await param2(ctx1, next);
    const res4 = await param2(ctx2, next);
    expect(res3.param).toBeUndefined();
    expect(res4.param).toBe('10.0.0.0');
  });

  test('Params with custom key and validation', async () => {
    const res5 = await param3(ctx2, next);
    const res6 = await param3(ctx3, next);
    expect(res5.paramStateKey).toBe('10.0.0.0');
    expect(res6.paramStateKey).toBeInstanceOf(z.ZodError);
  });

  const mockRouter = { metadata: {} },
    mockHandler = { metadata: {} };
  tsafe.assert(tsafe.is<Router>(mockRouter));
  tsafe.assert(tsafe.is<RouteHandler>(mockHandler));

  const paramMeta = {
    schema: {
      type: 'string',
    },
  };

  test('Metadata', () => {
    mockRouter.metadata = {};
    mockHandler.metadata = {};
    param1[MetaKeys.metaCallback]?.(mockRouter, mockHandler);

    expect(mockRouter.metadata).toEqual({});
    expect(mockHandler.metadata[MiddlwareMetaKeys.pathParams]?.param).toEqual(
      paramMeta,
    );

    mockRouter.metadata = {};
    mockHandler.metadata = {};
    param2[MetaKeys.metaCallback]?.(mockRouter, mockHandler);

    expect(mockRouter.metadata).toEqual({});
    expect(
      mockHandler.metadata[MiddlwareMetaKeys.pathParams]?.paramKey,
    ).toEqual(paramMeta);

    mockRouter.metadata = {};
    mockHandler.metadata = {};
    param3[MetaKeys.metaCallback]?.(mockRouter);

    expect(mockRouter.metadata[MiddlwareMetaKeys.pathParams]?.paramKey).toEqual(
      paramMeta,
    );
    expect(mockHandler.metadata).toEqual({});
  });
});

describe('Query params', async () => {
  const query1 = useQuery('query'),
    query2 = useQuery('query', 'queryKey'),
    query3 = useQuery(
      'queryStateKey',
      'queryKey',
      validatePipe(z.string().includes('token')),
    );

  const ctx1 = { query: { query: 'query-value' } };
  const ctx2 = { query: { queryKey: 'query-value' } };
  const ctx3 = { query: { queryKey: 'query-token-value' } };
  const next = noop;

  tsafe.assert(tsafe.is<Context>(ctx1));
  tsafe.assert(tsafe.is<Context>(ctx2));
  tsafe.assert(tsafe.is<Context>(ctx3));
  tsafe.assert(tsafe.is<Koa.Next>(next));

  test('Default query', async () => {
    const res1 = await query1(ctx1, next);
    const res2 = await query1(ctx2, next);
    expect(res1.query).toBe('query-value');
    expect(res2.query).toBeUndefined();
  });

  test('Query with custom key', async () => {
    const res3 = await query2(ctx1, next);
    const res4 = await query2(ctx2, next);
    expect(res3.query).toBeUndefined();
    expect(res4.query).toBe('query-value');
  });

  test('Params with custom key and validation', async () => {
    const res5 = await query3(ctx2, next);
    const res6 = await query3(ctx3, next);
    expect(res5.queryStateKey).toBeInstanceOf(z.ZodError);
    expect(res6.queryStateKey).toBe('query-token-value');
  });

  const mockRouter = { metadata: {} },
    mockHandler = { metadata: {} };
  tsafe.assert(tsafe.is<Router>(mockRouter));
  tsafe.assert(tsafe.is<RouteHandler>(mockHandler));

  const defaultSchema = {
      schema: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    zodSchema = {
      schema: {
        type: 'string',
        items: {
          type: 'string',
        },
        pattern: 'token',
      },
    };

  test('Metadata', () => {
    mockRouter.metadata = {};
    mockHandler.metadata = {};
    query1[MetaKeys.metaCallback]?.(mockRouter, mockHandler);

    expect(mockRouter.metadata[MiddlwareMetaKeys.query]?.query).toBeUndefined();
    expect(mockHandler.metadata[MiddlwareMetaKeys.query]?.query).toEqual(
      defaultSchema,
    );

    mockRouter.metadata = {};
    mockHandler.metadata = {};
    query2[MetaKeys.metaCallback]?.(mockRouter, mockHandler);

    expect(
      mockRouter.metadata[MiddlwareMetaKeys.query]?.queryKey,
    ).toBeUndefined();
    expect(mockHandler.metadata[MiddlwareMetaKeys.query]?.queryKey).toEqual(
      defaultSchema,
    );

    mockRouter.metadata = {};
    mockHandler.metadata = {};
    query3[MetaKeys.metaCallback]?.(mockRouter);

    expect(mockRouter.metadata[MiddlwareMetaKeys.query]?.queryKey).toEqual(
      zodSchema,
    );
    expect(
      mockHandler.metadata[MiddlwareMetaKeys.query]?.queryKey,
    ).toBeUndefined();
  });
});

describe('useBody', async () => {
  const schema = z.object({ name: z.string(), age: z.number() });
  const body = useBody(),
    bodyWithValidation = useBody(validatePipe(schema));

  const obj1 = { name: 'Vlad', age: 22 },
    obj2 = { name: 1234, age: '22' };

  const ctx1 = { request: { body: obj1 } };
  const ctx2 = { request: { body: obj2 } };
  const next = noop;

  tsafe.assert(tsafe.is<Context>(ctx1));
  tsafe.assert(tsafe.is<Context>(ctx2));
  tsafe.assert(tsafe.is<Koa.Next>(next));

  test('Any body', async () => {
    const res1 = await body(ctx1, next);
    expect(res1.body).toEqual(obj1);

    const res2 = await body(ctx2, next);
    expect(res2.body).toEqual(obj2);
  });

  test('Validated body', async () => {
    const res3 = await bodyWithValidation(ctx1, next);
    expect(res3.body).toEqual(obj1);

    const res4 = await bodyWithValidation(ctx2, next);
    expect(res4.body).toBeInstanceOf(z.ZodError);
  });

  const mockRouter = { metadata: {} },
    mockHandler = { metadata: {} };
  tsafe.assert(tsafe.is<Router>(mockRouter));
  tsafe.assert(tsafe.is<RouteHandler>(mockHandler));

  const bodySchema = {
      schema: {
        type: 'object',
      },
    },
    validationSchema = {
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          age: {
            type: 'number',
          },
        },
        required: ['name', 'age'],
      },
    };

  test('Metadata', () => {
    mockRouter.metadata = {};
    mockHandler.metadata = {};
    body[MetaKeys.metaCallback]?.(mockRouter, mockHandler);

    console.log(mockHandler, mockRouter);

    expect(mockRouter.metadata[MiddlwareMetaKeys.requestBody]).toBeUndefined();
    expect(mockHandler.metadata[MiddlwareMetaKeys.requestBody]).toEqual(
      bodySchema,
    );

    mockRouter.metadata = {};
    mockHandler.metadata = {};
    bodyWithValidation[MetaKeys.metaCallback]?.(mockRouter, mockHandler);

    expect(mockRouter.metadata[MiddlwareMetaKeys.requestBody]).toBeUndefined();
    expect(mockHandler.metadata[MiddlwareMetaKeys.requestBody]).toEqual(
      validationSchema,
    );
  });
});
