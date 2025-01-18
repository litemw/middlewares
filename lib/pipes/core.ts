import * as _ from 'lodash-es';
import { TransformFunction } from '../core';

export type PipeOrFunction<I = unknown, O = unknown> =
  | TransformFunction<I, O>
  | Pipe<I, O>;

export type PipeOrFunctionOrValue<I = unknown, O = unknown> =
  | PipeOrFunction<I, O>
  | O;

export type Pipe<I = unknown, O = unknown> = {
  (value: I): O;
  pipe<T>(pipe: PipeOrFunction<O, T>): Pipe<I, T>;
  flatPipe<T>(pipe: PipeOrFunction<Awaited<O>, T>): Pipe<I, Promise<T>>;
  metadata: Record<any, any>;
};

function newPipe(this: Pipe, pipeOrFnInner: PipeOrFunction): Pipe {
  const fn = function (this: Pipe, value: unknown) {
    return pipeOrFnInner(this(value));
  }.bind(this) as Pipe;

  fn.pipe = newPipe.bind(fn) as Pipe['pipe'];
  fn.flatPipe = newFlatPipe.bind(fn) as Pipe['flatPipe'];

  fn.metadata = Object.assign({}, this.metadata);
  if ('metadata' in pipeOrFnInner) {
    Object.assign(fn.metadata, pipeOrFnInner.metadata);
  }

  return fn;
}

function newFlatPipe(
  this: Pipe,
  pipeOrFnInner: PipeOrFunction<Awaited<unknown>>,
): Pipe<unknown, Promise<unknown>> {
  return this.pipe(async (arg) => pipeOrFnInner(await arg));
}

export function pipe<I = void, O = I>(
  pipeOrFnOrVal: PipeOrFunctionOrValue<I, O>,
): Pipe<I, O> {
  const functionObj = !_.isFunction(pipeOrFnOrVal)
    ? function () {
        return pipeOrFnOrVal;
      }
    : pipeOrFnOrVal;

  const pipeObj = functionObj.bind({}) as Pipe;

  pipeObj.pipe = newPipe.bind(pipeObj) as Pipe['pipe'];
  pipeObj.flatPipe = newFlatPipe.bind(pipeObj) as Pipe['flatPipe'];
  pipeObj.metadata = {};

  return pipeObj as Pipe<I, O>;
}
