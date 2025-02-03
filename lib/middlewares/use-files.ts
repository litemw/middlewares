import multer from '@koa/multer';
import { MetaKeys, Middleware } from '@litemw/router';
import { Next } from 'koa';
import { pipe, PipeOrFunction } from '../pipes';
import { oas31 } from 'openapi3-ts';
import { MiddlwareMetaKeys } from '../metadata';

import cloneDeep from 'lodash/cloneDeep.js';
import identity from 'lodash/identity.js';
import merge from 'lodash/merge.js';
import set from 'lodash/set.js';
import noop from 'lodash/noop.js';
import isNumber from 'lodash/isNumber.js';
import isFunction from 'lodash/isFunction.js';
import fromPairs from 'lodash/fromPairs.js';

const fileSchema: { schema: oas31.SchemaObject } = {
  schema: { type: 'string', format: 'binary' },
};
const multipleFilesSchema: { schema: oas31.SchemaObject } = {
  schema: {
    type: 'array',
    items: {
      format: 'binary',
      type: 'string',
    },
  },
};

export function useFiles(options?: multer.Options) {
  const upload = multer(options);

  function single<T, F extends string>(
    fieldName: F,
  ): Middleware<T, Record<F, multer.File>>;

  function single<T, F extends string, R>(
    fieldName: F,
    pipeOrFn: PipeOrFunction<multer.File, R>,
  ): Middleware<T, Record<F, R>>;

  function single(fieldName: string, pipeOrFn?: PipeOrFunction) {
    const transform = pipe(pipeOrFn ?? identity);
    const meta = cloneDeep(fileSchema);
    merge(meta, transform.metadata);

    const mw: Middleware = async (ctx) => {
      await upload.single(fieldName)(ctx, noop as Next);
      return { [fieldName]: transform(ctx.file) };
    };

    const path = [MiddlwareMetaKeys.files, fieldName];
    mw[MetaKeys.metaCallback] = (router, handler) => {
      if (handler) {
        set(handler.metadata, path, meta);
      } else {
        set(router.metadata, path, meta);
      }
    };

    return mw;
  }

  function fields<T, const F extends string>(
    fields: { name: F; maxCount?: number }[],
  ): Middleware<T, Record<F, multer.File[]>>;

  function fields<T, const F extends string, R>(
    fields: { name: F; maxCount?: number }[],
    pipeOrFn: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<F, R>>;

  function fields(
    fields: { name: string; maxCount?: number }[],
    pipeOrFn?: PipeOrFunction,
  ) {
    const transform = pipe(pipeOrFn ?? identity);
    const mw: Middleware = async (ctx) => {
      await upload.fields(fields)(ctx, noop as Next);

      return fromPairs(
        fields.map((field) => [
          field.name,
          transform((ctx.files as Record<string, multer.File[]>)[field.name]),
        ]),
      );
    };

    const meta = fromPairs(
      fields.map((f) => [
        f.name,
        {
          schema: { ...multipleFilesSchema.schema, maxItems: f.maxCount },
        },
      ]),
    );

    merge(meta, transform.metadata);

    mw[MetaKeys.metaCallback] = (router, handler) => {
      if (handler) {
        merge(handler.metadata, { [MiddlwareMetaKeys.files]: meta });
      } else {
        merge(router.metadata, { [MiddlwareMetaKeys.files]: meta });
      }
    };

    return mw;
  }

  function array<T, F extends string>(
    name: F,
  ): Middleware<T, Record<F, multer.File>>;

  function array<T, F extends string>(
    name: F,
    maxCount: number,
  ): Middleware<T, Record<F, multer.File>>;

  function array<T, F extends string, R>(
    name: F,
    pipeOrFn: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<F, R>>;

  function array<T, F extends string, R>(
    name: F,
    maxCount: number,
    pipeOrFn: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<F, R>>;

  function array(
    name: string,
    countOrPipe?: number | PipeOrFunction,
    pipeOrFn?: PipeOrFunction,
  ) {
    const transform = pipe(
        pipeOrFn ?? (isFunction(countOrPipe) ? countOrPipe : identity),
      ),
      maxCount = isNumber(countOrPipe) ? countOrPipe : undefined;

    const meta = {
      schema: { ...multipleFilesSchema, maxCount },
    };
    merge(meta, transform.metadata);

    const mw: Middleware = async (ctx) => {
      await upload.array(name, maxCount)(ctx, noop as Next);
      return { [name]: transform(ctx.files) };
    };

    const path = [MiddlwareMetaKeys.files, name];
    mw[MetaKeys.metaCallback] = (router, handler) => {
      if (handler) {
        set(handler.metadata, path, meta);
      } else {
        set(router.metadata, path, meta);
      }
    };

    return mw;
  }

  function any<T>(): Middleware<T, Record<'files', multer.File[]>>;

  function any<T, R>(
    pipeOrFn: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<'files', R>>;

  function any(pipeOrFn?: PipeOrFunction) {
    const transform = pipe(pipeOrFn ?? identity);
    const meta = cloneDeep(multipleFilesSchema);
    merge(meta, transform.metadata);

    const mw: Middleware = async (ctx) => {
      await upload.any()(ctx, noop as Next);
      return { files: transform(ctx.files) as multer.File[] };
    };

    const path = [MiddlwareMetaKeys.files, 'files'];
    mw[MetaKeys.metaCallback] = (router, handler) => {
      if (handler) {
        set(handler.metadata, path, meta);
      } else {
        set(router.metadata, path, meta);
      }
    };

    return mw;
  }

  return {
    single,
    fields,
    array,
    any,
  };
}
