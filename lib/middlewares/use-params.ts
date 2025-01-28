import { MetaKeys, Middleware } from '@litemw/router';
import {
  cloneDeep,
  identity,
  isFunction,
  isString,
  merge,
  set,
} from 'lodash-es';
import { pipe, PipeOrFunction } from '../pipes';
import { Context } from 'koa';
import { MiddlwareMetaKeys } from '../metadata';
import { oas31 } from 'openapi3-ts';

const defaultParamSchema: { schema: oas31.SchemaObject } = {
  schema: { type: 'string' },
};

export function useParam<const K extends string>(
  key: K,
): Middleware<any, Record<K, string | undefined>>;

export function useParam<const K extends string, T = string>(
  key: K,
  pipeOrFn: PipeOrFunction<string | undefined, T>,
): Middleware<any, Record<K, Awaited<T>>>;

export function useParam<const K extends string>(
  key: K,
  paramKey: string,
): Middleware<any, Record<K, string | undefined>>;

export function useParam<const K extends string, T = string>(
  key: K,
  paramKey: string,
  pipeOrFn: PipeOrFunction<string | undefined, T>,
): Middleware<any, Record<K, Awaited<T>>>;

export function useParam(
  key: string,
  paramOrPipe?: string | PipeOrFunction<string, any>,
  pipeOrFn?: PipeOrFunction<string, any>,
) {
  const paramKey = isString(paramOrPipe) ? paramOrPipe : key;
  const transform = pipe(
    pipeOrFn ?? (isFunction(paramOrPipe) ? paramOrPipe : identity),
  );
  const meta = cloneDeep(defaultParamSchema);
  merge(meta, transform.metadata);

  const mw: Middleware = async (ctx: Context) => {
    return { [key]: await transform(ctx.params[paramKey]) };
  };

  const path = [MiddlwareMetaKeys.pathParams, paramKey];
  mw[MetaKeys.metaCallback] = (router, handler) => {
    if (handler) {
      set(handler.metadata, path, meta);
    } else {
      set(router.metadata, path, meta);
    }
  };

  return mw;
}
