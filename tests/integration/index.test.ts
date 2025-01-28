import { describe, expect, mock, test } from 'bun:test';
import Koa from 'koa';
import request from 'supertest';
import { createRouter } from '@litemw/router';
import { useBody, useFiles, useParam, useQuery } from '../../lib';
import bodyParser from 'koa-bodyparser';
import { memoryStorage } from '@koa/multer';

const port = 8080;

describe('Middlewares test', async () => {
  const callback = mock((...args: any[]) => void 0);

  const router = createRouter('/api/:ver').use(useParam('ver'));

  const paramHandler = router
    .get('/params/:param')
    .use(useParam('param'))
    .use((ctx) => {
      callback(ctx.state.ver, ctx.state.param);
    });

  const queryHandler = router
    .get('/query')
    .use(useQuery('query'))
    .use((ctx) => {
      callback(ctx.state.ver, ctx.state.query);
    });

  const bodyHandler = router
    .post('/body')
    .use(useBody())
    .use((ctx) => {
      callback(ctx.state.ver, ctx.state.body);
    });

  const fileHandler = router
    .post('/file')
    .use(useFiles({ storage: memoryStorage() }).single('file'))
    .use((ctx) => {
      callback(ctx.state.ver, ctx.state.file);
    });

  const app = new Koa();
  app.use(bodyParser());
  app.use(router.routes());
  const server = app.listen(port);

  const ver = 'v1';

  test('Params route', async () => {
    callback.mockClear();
    await new Promise((resolve) =>
      request(server)
        .get(`/api/${ver}/params/some-param`)
        .expect(200)
        .end(resolve),
    );
    expect(callback).toHaveBeenCalledWith(ver, 'some-param');
  });

  test('Query params route', async () => {
    callback.mockClear();
    await new Promise((resolve) =>
      request(server)
        .get(`/api/${ver}/query?query=abc123`)
        .expect(200)
        .end(resolve),
    );
    expect(callback).toHaveBeenCalledWith(ver, 'abc123');
  });

  test('Body route', async () => {
    callback.mockClear();
    const obj = { str: 'string', num: 42 };
    await new Promise((resolve) =>
      request(server)
        .post(`/api/${ver}/body`)
        .send(obj)
        .expect(200)
        .end(resolve),
    );
    expect(callback).toHaveBeenCalledWith(ver, obj);
  });

  test('Files route', async () => {
    callback.mockClear();
    const buffer = Buffer.from([
      1, 2, 3, 4, 5, 42, 1245, 123, 2367, 367, 35673,
    ]);
    await new Promise((resolve) =>
      request(server)
        .post(`/api/${ver}/file`)
        .attach('file', buffer, 'package.json')
        .expect(200)
        .end(resolve),
    );

    expect(callback).toBeCalledTimes(1);
    const res = callback.mock.calls[0];
    expect(res).toHaveLength(2);
    expect(res[0] as any).toEqual(ver);
    expect(res[1]).toHaveProperty('mimetype', 'application/json');
    expect(res[1]).toHaveProperty('buffer');
    expect(res[1].buffer).toEqual(buffer);
  });

  const pathMeta = { 'path-params': { param: { schema: { type: 'string' } } } },
    queryMeta = {
      query: {
        query: { schema: { type: 'array', items: { type: 'string' } } },
      },
    },
    bodyMeta = { 'request-body': { schema: { type: 'object' } } },
    filesMeta = {
      files: { file: { schema: { type: 'string', format: 'binary' } } },
    },
    routerMeta = { 'path-params': { ver: { schema: { type: 'string' } } } };

  test('Metadata', async () => {
    expect(router.metadata).toEqual(routerMeta);
    expect(paramHandler.metadata).toEqual(pathMeta);
    expect(queryHandler.metadata).toEqual(queryMeta);
    expect(bodyHandler.metadata).toEqual(bodyMeta);
    expect(fileHandler.metadata).toEqual(filesMeta);
  });
});
