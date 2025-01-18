import { identity } from 'lodash-es';
import { Pipe } from '../pipes';
import { Middleware } from '@litemw/router';

export function useBody<C = any>(
  pipe?: Pipe<any, C>,
): Middleware<any, { body: Awaited<C> }> {
  const fn = pipe ?? identity;
  return async (ctx) => ({
    body: (await fn(ctx.request.body)) as any,
  });
}
