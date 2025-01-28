import { MetaKeys, Middleware } from '@litemw/router';
import { pipe, PipeOrFunction } from '../pipes';
import { identity, isFunction, isString, set } from 'lodash-es';
import { Context } from 'koa';
import { MiddlwareMetaKeys } from '../metadata';
import { oas31 } from 'openapi3-ts';

const defaultQuerySchema: { schema: oas31.SchemaObject } = {
  schema: { type: 'array', items: { type: 'string' } },
};

export function useQuery<const K extends string>(
  key: K,
): Middleware<any, Record<K, string | string[] | undefined>>;

export function useQuery<const K extends string, T = string>(
  key: K,
  pipeOrFn: PipeOrFunction<string | string[] | undefined, T>,
): Middleware<any, Record<K, Awaited<T>>>;

export function useQuery<const K extends string>(
  key: K,
  paramKey: string,
): Middleware<any, Record<K, string | string[] | undefined>>;

export function useQuery<const K extends string, T = string>(
  key: K,
  paramKey: string,
  pipeOrFn: PipeOrFunction<string | string[] | undefined, T>,
): Middleware<any, Record<K, Awaited<T>>>;

export function useQuery(
  key: string,
  paramOrPipe?: string | PipeOrFunction<string | string[] | undefined, any>,
  pipeOrFn?: PipeOrFunction<string | string[] | undefined, any>,
) {
  const paramKey = isString(paramOrPipe) ? paramOrPipe : key;
  const transform = pipe(
    pipeOrFn ?? (isFunction(paramOrPipe) ? paramOrPipe : identity),
  );
  const meta = transform.metadata ?? defaultQuerySchema;

  const mw: Middleware = async (ctx: Context) => {
    return { [key]: await transform(ctx.query[paramKey]) };
  };

  const path = [MiddlwareMetaKeys.query, paramKey];
  mw[MetaKeys.metaCallback] = (router, handler) => {
    set(router.metadata, path, meta);
    if (handler) {
      set(handler, path, meta);
    }
  };

  return mw;
}
