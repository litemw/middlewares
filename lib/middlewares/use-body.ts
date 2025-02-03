import { pipe, PipeOrFunction } from '../pipes';
import { MetaKeys, Middleware } from '@litemw/router';
import { MiddlwareMetaKeys } from '../metadata';
import { oas31 } from 'openapi3-ts';

import cloneDeep from 'lodash/cloneDeep.js';
import identity from 'lodash/identity.js';
import merge from 'lodash/merge.js';
import set from 'lodash/set.js';

const defaultBodySchema: { schema: oas31.SchemaObject } = {
  schema: { type: 'object' },
};

export function useBody<C = any>(
  pipeOrFn?: PipeOrFunction<any, C>,
): Middleware<any, { body: Awaited<C> }> {
  const transform = pipe(pipeOrFn ?? identity);
  const meta = cloneDeep(defaultBodySchema);
  merge(meta, transform.metadata);

  const mw: Middleware<any, { body: Awaited<C> }> = async (ctx) => ({
    body: (await transform(ctx.request.body)) as any,
  });

  mw[MetaKeys.metaCallback] = (router, handler) => {
    if (handler) {
      set(handler.metadata, [MiddlwareMetaKeys.requestBody], meta);
    } else {
      set(router.metadata, [MiddlwareMetaKeys.requestBody], meta);
    }
  };

  return mw;
}
