import { Middleware } from '@litemw/router';
import { identity, isFunction, isString } from 'lodash';
import { pipe, PipeOrFunction } from '../pipes';
import { Context } from 'koa';

export function useParam<const K extends string>(
  key: K,
): Middleware<any, Record<K, string>>;

export function useParam<const K extends string, T = string>(
  key: K,
  pipe: PipeOrFunction<string, T>,
): Middleware<any, Record<K, Awaited<T>>>;

export function useParam<const K extends string>(
  key: K,
  paramKey: string,
): Middleware<any, Record<K, string>>;

export function useParam<const K extends string, T = string>(
  key: K,
  paramKey: string,
  pipe: PipeOrFunction<string, T>,
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

  return async (ctx: Context) => {
    return { [key]: await transform(ctx.params[paramKey]) };
  };
}
