import multer from '@koa/multer';
import { Middleware } from '@litemw/router';
import { fromPairs, identity, isFunction, isNumber, noop } from 'lodash';
import { Next } from 'koa';
import { PipeOrFunction } from '../pipes';

export function useFiles(options?: multer.Options) {
  const upload = multer(options);

  function single<T, F extends string>(
    fieldName: F,
  ): Middleware<T, Record<F, multer.File>>;

  function single<T, F extends string, R>(
    fieldName: F,
    pipe: PipeOrFunction<multer.File, R>,
  ): Middleware<T, Record<F, R>>;

  function single<T, F extends string>(
    fieldName: F,
    pipe?: PipeOrFunction,
  ): Middleware<T, Record<F, any>> {
    const fn = pipe ?? identity;
    return async (ctx, next) => {
      await upload.single(fieldName)(ctx, noop as Next);
      return { [fieldName]: fn(ctx.file) } as Record<F, any>;
    };
  }

  function fields<T, const F extends string>(
    fields: { name: F; maxCount: number }[],
  ): Middleware<T, Record<F, multer.File[]>>;

  function fields<T, const F extends string, R>(
    fields: { name: F; maxCount: number }[],
    pipe: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<F, R>>;

  function fields<T, const F extends string>(
    fields: { name: F; maxCount: number }[],
    pipe?: PipeOrFunction,
  ): Middleware<T, Record<F, any>> {
    const fn = pipe ?? identity;
    return async (ctx, next) => {
      await upload.fields(fields)(ctx, noop as Next);

      return fromPairs(
        fields.map((field) => [
          field.name,
          fn((ctx.files as Record<string, multer.File[]>)[field.name]),
        ]),
      ) as Record<F, any>;
    };
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
    pipe: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<F, R>>;

  function array<T, F extends string, R>(
    name: F,
    maxCount: number,
    pipe: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<F, R>>;

  function array<T, F extends string>(
    name: F,
    countOrPipe?: number | PipeOrFunction,
    pipe?: PipeOrFunction,
  ): Middleware<T, Record<F, any>> {
    const fn = pipe ?? (isFunction(countOrPipe) ? countOrPipe : identity),
      maxCount = isNumber(countOrPipe) ? countOrPipe : undefined;

    return async (ctx, next) => {
      await upload.array(name, maxCount)(ctx, noop as Next);
      return { [name]: fn(ctx.files) } as Record<F, any>;
    };
  }

  function any<T>(): Middleware<T, Record<'files', multer.File[]>>;

  function any<T, R>(
    pipe: PipeOrFunction<multer.File[], R>,
  ): Middleware<T, Record<'files', R>>;

  function any<T>(pipe?: PipeOrFunction): Middleware<T, Record<'files', any>> {
    const fn = pipe ?? identity;
    return async (ctx, next) => {
      await upload.any()(ctx, noop as Next);
      return { files: fn(ctx.files) as multer.File[] };
    };
  }

  return {
    single,
    fields,
    array,
    any,
  };
}
