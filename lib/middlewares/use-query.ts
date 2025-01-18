import { Middleware } from '@litemw/router';
import { pipe, PipeOrFunction } from '../pipes';
import { identity, isFunction, isString } from 'lodash';
import { Context } from 'koa';

export function useQuery<const K extends string>(
  key: K,
): Middleware<any, Record<K, string | string[] | undefined>>;

export function useQuery<const K extends string, T = string>(
  key: K,
  pipe: PipeOrFunction<string | string[] | undefined, T>,
): Middleware<any, Record<K, Awaited<T>>>;

export function useQuery<const K extends string>(
  key: K,
  paramKey: string,
): Middleware<any, Record<K, string | string[] | undefined>>;

export function useQuery<const K extends string, T = string>(
  key: K,
  paramKey: string,
  pipe: PipeOrFunction<string | string[] | undefined, T>,
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

  return async (ctx: Context) => {
    return { [key]: await transform(ctx.query[paramKey]) };
  };
}
