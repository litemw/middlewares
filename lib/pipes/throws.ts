import { Pipe, pipe } from './core';

export function throwPipe<
  ValueType,
  ErrorType extends Error,
  Input = ValueType | ErrorType,
>(): Pipe<Input, Exclude<Input, ErrorType>> {
  return pipe((val: any) => {
    if (val instanceof Error) {
      throw val;
    } else return val;
  });
}
